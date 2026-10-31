"""Publish project video derivatives without changing their soundtrack or picture.

The original R2 file stays private. A source-matched browser-compatible MP4
derivative is served only for a published project through signed URLs.
Automatic contact masking, speech muting and synthetic music are disabled.
Project owners are responsible for removing contacts they do not wish to share.
Admin lead-credit review remains a separate requirement.
"""
import contextlib
import json
import logging
import os
import subprocess
import tempfile
import time
import uuid
from pathlib import Path

import boto3
import psycopg
from botocore.config import Config

LOG = logging.getLogger("propulse.video_processor")
logging.basicConfig(level=os.environ.get("LOG_LEVEL", "INFO").upper())
PREFIX = "private-object-s3:"
MAX_BYTES = int(os.environ.get("VIDEO_REDACTOR_MAX_BYTES", str(750 * 1024 * 1024)))
MAX_SECONDS = int(os.environ.get("VIDEO_REDACTOR_MAX_SECONDS", "600"))


def r2_client():
    missing = [name for name in ("PRIVATE_OBJECT_STORAGE_ENDPOINT",
        "PRIVATE_OBJECT_STORAGE_BUCKET", "PRIVATE_OBJECT_STORAGE_ACCESS_KEY_ID",
        "PRIVATE_OBJECT_STORAGE_SECRET_ACCESS_KEY") if not os.getenv(name)]
    if missing:
        raise RuntimeError("Missing worker R2 configuration: " + ", ".join(missing))
    return boto3.client("s3",
        endpoint_url=os.environ["PRIVATE_OBJECT_STORAGE_ENDPOINT"],
        region_name=os.getenv("PRIVATE_OBJECT_STORAGE_REGION", "auto"),
        aws_access_key_id=os.environ["PRIVATE_OBJECT_STORAGE_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["PRIVATE_OBJECT_STORAGE_SECRET_ACCESS_KEY"],
        config=Config(s3={"addressing_style": "path"}, retries={"max_attempts": 3}))


def claim_job(connection):
    """Lease one project; reclaim crashed workers only after 45 minutes."""
    with connection.transaction():
        row = connection.execute("""
            SELECT p.id,p.video_url,bp.user_id
              FROM business_profile_projects p
              JOIN business_profiles bp ON bp.id=p.business_profile_id
             WHERE p.video_url IS NOT NULL AND p.video_url<>''
               AND p.is_published=TRUE
               AND (p.video_redaction_status='pending'
                  OR (p.video_redaction_status='processing'
                      AND p.video_redaction_started_at < now() - interval '45 minutes'))
             ORDER BY p.id
             FOR UPDATE OF p SKIP LOCKED LIMIT 1
        """).fetchone()
        if not row:
            return None
        token = str(uuid.uuid4())
        connection.execute("""
            UPDATE business_profile_projects
               SET video_redaction_status='processing',
                   video_redaction_started_at=now(),
                   video_redaction_finished_at=NULL,
                   video_redaction_error=NULL,
                   video_redaction_token=%s
             WHERE id=%s
        """, (token, row[0]))
        return dict(id=row[0], source=row[1], owner=row[2], token=token)


def active_job(connection, job):
    row = connection.execute("""
        SELECT 1 FROM business_profile_projects
         WHERE id=%s AND video_url=%s AND video_redaction_token=%s
           AND video_redaction_status='processing'
    """, (job["id"], job["source"], job["token"])).fetchone()
    return bool(row)


def probe_streams(source_path):
    result = subprocess.run(["ffprobe", "-v", "error",
        "-show_entries", "format=duration:stream=index,codec_type,codec_name",
        "-of", "json", str(source_path)],
        check=True, capture_output=True, text=True, timeout=30)
    return json.loads(result.stdout)


def transcode(source_path, output_path):
    """Keep original picture and audio; encode only for browser compatibility."""
    info = probe_streams(source_path)
    video = next((s for s in info.get("streams", [])
                  if s.get("codec_type") == "video"), None)
    audio = next((s for s in info.get("streams", [])
                  if s.get("codec_type") == "audio"), None)
    if video is None:
        raise RuntimeError("Video is missing its video stream")
    duration = float(info.get("format", {}).get("duration") or 0)
    if not 0 < duration <= MAX_SECONDS:
        raise RuntimeError("Invalid or overlong project video")

    # Stream copy offers bit-exact source audio and video when already
    # supported by major browsers; transcoding never replaces the music.
    video_copy = video.get("codec_name") == "h264"
    audio_copy = audio is None or audio.get("codec_name") == "aac"
    args = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-nostdin",
        "-y", "-i", str(source_path), "-map", "0:v:0", "-map", "0:a:0?",
        "-sn", "-dn", "-map_metadata", "-1"]
    if video_copy:
        args += ["-c:v", "copy"]
    else:
        args += ["-c:v", "libx264", "-preset", "veryfast", "-crf", "19",
                 "-vf", "scale=1920:1920:force_original_aspect_ratio=decrease:"
                        "force_divisible_by=2", "-pix_fmt", "yuv420p"]
    if audio_copy:
        args += ["-c:a", "copy"]
    else:
        args += ["-c:a", "aac", "-b:a", "192k"]
    args += ["-movflags", "+faststart", str(output_path)]
    try:
        subprocess.run(args, check=True, capture_output=True, timeout=max(180, 5*duration))
    except subprocess.CalledProcessError as exc:
        raise RuntimeError("MP4 preparation failed: " +
                           exc.stderr.decode("utf-8", "replace")[-600:]) from exc

    result = probe_streams(output_path)
    rendered_video = next((s for s in result.get("streams", [])
                           if s.get("codec_type") == "video"), None)
    rendered_audio = next((s for s in result.get("streams", [])
                           if s.get("codec_type") == "audio"), None)
    if rendered_video is None or bool(audio) != bool(rendered_audio):
        raise RuntimeError("Output media streams differ from source")
    output_duration = float(result.get("format", {}).get("duration") or 0)
    if abs(output_duration - duration) > 1.5:
        raise RuntimeError("Output video duration does not match source")
    return {"video": "unchanged" if video_copy else "browser encoded",
            "audio": "original retained" if audio_copy and audio else
                     "original re-encoded" if audio else "no source track"}


def process_one(connection, client, job):
    reference=job["source"]
    if not reference.startswith(PREFIX+"business-projects/"):
        raise RuntimeError("Video processing requires a directly uploaded R2 project video")
    source_key=reference[len(PREFIX):]
    if "/" in source_key[len("business-projects/"):]:
        raise RuntimeError("Invalid source video key")
    bucket=os.environ["PRIVATE_OBJECT_STORAGE_BUCKET"]
    head=client.head_object(Bucket=bucket,Key=source_key)
    size=int(head.get("ContentLength",0))
    if not 12<=size<=MAX_BYTES:
        raise RuntimeError("Video size exceeds auto-redaction worker limit")
    # Legacy R2 prefix and database fields retained for compatibility.
    derivative_key=("business-project-redacted/"
        +str(job["owner"])+"-"+str(job["id"])+"-"+uuid.uuid4().hex+".mp4")
    with tempfile.TemporaryDirectory(prefix="propulse-video-") as folder:
        original=Path(folder)/"input"
        processed=Path(folder)/"playback.mp4"
        client.download_file(bucket,source_key,str(original))
        if original.stat().st_size != size:
            raise RuntimeError("Downloaded video changed during processing")
        stats=transcode(original,processed)
        if processed.stat().st_size<1024:
            raise RuntimeError("Empty processed video")
        if not active_job(connection,job):
            LOG.warning("Abandoned stale project %s; upload skipped", job["id"])
            return
        client.upload_file(str(processed),bucket,derivative_key,
            ExtraArgs={"ContentType":"video/mp4","CacheControl":"private,no-store"})
    reference_out=PREFIX+derivative_key
    with connection.transaction():
        updated=connection.execute("""
            UPDATE business_profile_projects
               SET video_redaction_status='ready',
                   video_redaction_source_url=%s,
                   video_redacted_url=%s,
                   video_redaction_error=NULL,
                   video_redaction_finished_at=now(),
                   video_redaction_token=NULL,
                   video_privacy_cleared_url=NULL,
                   video_reward_status='pending',
                   video_reward_fingerprint=NULL,
                   video_reward_approved_url=NULL,
                   video_reward_reviewed_by=NULL,
                   video_reward_reviewed_at=NULL
             WHERE id=%s AND video_url=%s AND video_redaction_token=%s
               AND video_redaction_status='processing'
         RETURNING id
        """,(reference,reference_out,job["id"],reference,job["token"])).fetchone()
    if not updated:
        client.delete_object(Bucket=bucket,Key=derivative_key)
        LOG.warning("Project %s changed before derivative commit; discarded",job["id"])
    else:
        LOG.info("Project %s prepared for public playback; original video %s, audio %s; reward review separate",
                 job["id"],stats["video"],stats["audio"])


def main():
    dsn=os.environ.get("DATABASE_URL") or os.environ.get("SUPABASE_DATABASE_URL")
    if not dsn:
        raise RuntimeError("DATABASE_URL required to poll project videos")
    client=r2_client()
    poll=max(5,int(os.environ.get("VIDEO_REDACTOR_POLL_SECONDS","20")))
    # A scheduled GitHub Actions runner can process one queued video then exit.
    # The normal Docker deployment continues polling as before.
    run_once=os.environ.get("VIDEO_REDACTOR_ONCE","").lower() in ("1","true","yes")
    while True:
        try:
            with psycopg.connect(dsn,autocommit=True,connect_timeout=20) as connection:
                job=claim_job(connection)
                if not job:
                    if run_once:
                        LOG.info("No pending project videos to process")
                        return
                    time.sleep(poll)
                    continue
                try:
                    process_one(connection,client,job)
                except Exception as exc:
                    LOG.exception("Project %s video preparation failed",job["id"])
                    with connection.transaction():
                        connection.execute("""
                            UPDATE business_profile_projects
                               SET video_redaction_status='failed',
                                   video_redaction_error=%s,
                                   video_redaction_finished_at=now(),
                                   video_redaction_token=NULL
                             WHERE id=%s AND video_url=%s AND video_redaction_token=%s
                               AND video_redaction_status='processing'
                        """,(str(exc)[:400],job["id"],job["source"],job["token"]))
                    if run_once:
                        raise
                if run_once:
                    return
        except Exception:
            LOG.exception("Redaction poll unavailable; retrying without releasing any private videos")
            if run_once:
                raise
            time.sleep(poll)


if __name__=="__main__":
    main()
