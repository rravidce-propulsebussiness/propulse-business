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
# Upload limit in backend/src/services/projectVideoService.js must match MAX_BYTES.
# Sized for a GitHub-hosted runner: about 14 GB disk (original + playback copy) and
# the 120-minute job limit in project-video-redaction.yml.
MAX_BYTES = int(os.environ.get("VIDEO_REDACTOR_MAX_BYTES", str(2 * 1024 * 1024 * 1024)))
MAX_SECONDS = int(os.environ.get("VIDEO_REDACTOR_MAX_SECONDS", "900"))

# Admin "Compress videos" switch (video_processing_settings). Off by default, so playback
# copies keep the original picture and sound.
DEFAULT_SETTINGS = {"compress": False, "max_resolution": 1080, "quality": "balanced"}
QUALITY_CRF = {"high": 20, "balanced": 23, "small": 26}
# Cap on the longer side, so portrait and landscape videos both end at e.g. 1080p.
LONG_EDGE = {720: 1280, 1080: 1920, 1440: 2560}


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
    """Lease one project; reclaim crashed workers only after the 120-minute job limit."""
    with connection.transaction():
        row = connection.execute("""
            SELECT p.id,p.video_url,bp.user_id
              FROM business_profile_projects p
              JOIN business_profiles bp ON bp.id=p.business_profile_id
             WHERE p.video_url IS NOT NULL AND p.video_url<>''
               AND p.is_published=TRUE
               AND (p.video_redaction_status='pending'
                  OR (p.video_redaction_status='processing'
                      AND p.video_redaction_started_at < now() - interval '150 minutes'))
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


def load_settings(connection):
    """Read the admin compression switch; any problem keeps the original-quality default."""
    try:
        with connection.transaction():
            row = connection.execute("""
                SELECT compress_enabled,max_resolution,quality
                  FROM video_processing_settings WHERE id=1
            """).fetchone()
    except psycopg.Error:
        LOG.warning("Video processing settings unavailable; keeping original quality")
        return dict(DEFAULT_SETTINGS)
    if not row:
        return dict(DEFAULT_SETTINGS)
    resolution = int(row[1]) if int(row[1] or 0) in LONG_EDGE else DEFAULT_SETTINGS["max_resolution"]
    quality = row[2] if row[2] in QUALITY_CRF else DEFAULT_SETTINGS["quality"]
    return {"compress": row[0] is True, "max_resolution": resolution, "quality": quality}


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


def transcode(source_path, output_path, settings=None):
    """Keep original picture and audio; encode only for browser compatibility.

    With the admin compression switch on, re-encode to H.264 at the chosen size
    and quality instead, unless that would not make the file smaller."""
    settings = settings or DEFAULT_SETTINGS
    info = probe_streams(source_path)
    video = next((s for s in info.get("streams", [])
                  if s.get("codec_type") == "video"), None)
    audio = next((s for s in info.get("streams", [])
                  if s.get("codec_type") == "audio"), None)
    if video is None:
        raise RuntimeError("Video is missing its video stream")
    duration = float(info.get("format", {}).get("duration") or 0)
    if not 0 < duration <= MAX_SECONDS:
        raise RuntimeError("Video is empty or longer than the %d-minute processing limit" % (MAX_SECONDS // 60))

    # Stream copy offers bit-exact source audio and video when already
    # supported by major browsers; transcoding never replaces the music.
    browser_video = video.get("codec_name") == "h264"
    compress = settings.get("compress") is True
    video_copy = browser_video and not compress
    audio_copy = audio is None or audio.get("codec_name") == "aac"

    def render(copy_video):
        args = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-nostdin",
            "-y", "-i", str(source_path), "-map", "0:v:0", "-map", "0:a:0?",
            "-sn", "-dn", "-map_metadata", "-1"]
        if copy_video:
            args += ["-c:v", "copy"]
        elif compress:
            edge = LONG_EDGE[settings["max_resolution"]]
            args += ["-c:v", "libx264", "-preset", "faster",
                     "-crf", str(QUALITY_CRF[settings["quality"]]),
                     "-vf", f"scale={edge}:{edge}:force_original_aspect_ratio=decrease:"
                            "force_divisible_by=2", "-pix_fmt", "yuv420p"]
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

    render(video_copy)
    video_label = "unchanged" if video_copy else "browser encoded"
    if compress:
        video_label = (f"compressed to {settings['max_resolution']}p max "
                       f"({settings['quality']} quality)")
        # An already small H.264 upload can grow when re-encoded; keep the original then.
        if browser_video and output_path.stat().st_size >= Path(source_path).stat().st_size:
            render(True)
            video_copy = True
            video_label = "unchanged (compression would not reduce size)"

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
    return {"video": video_label,
            "audio": "original retained" if audio_copy and audio else
                     "original re-encoded" if audio else "no source track"}


def generate_thumbnail(playback_path, output_path):
    """Extract a real image from the processed video without changing media streams."""
    duration=float(probe_streams(playback_path).get("format",{}).get("duration") or 0)
    if not 0 < duration <= MAX_SECONDS:
        raise RuntimeError("Invalid playback video for thumbnail")
    second=max(0.05,min(2.0,duration*0.25))
    subprocess.run([
        "ffmpeg","-hide_banner","-loglevel","error","-nostdin","-y",
        "-ss",str(second),"-i",str(playback_path),
        "-map","0:v:0","-frames:v","1",
        "-vf","scale=1280:720:force_original_aspect_ratio=decrease:force_divisible_by=2",
        "-q:v","3",str(output_path)
    ],check=True,capture_output=True,timeout=60)
    data=output_path.read_bytes()
    if len(data)<1024 or len(data)>4*1024*1024 or not data.startswith(b"\xff\xd8\xff"):
        raise RuntimeError("Video thumbnail JPEG is missing or invalid")
    return round(duration,2)


def thumbnail_key(job):
    return ("business-project-thumbnails/"
        +str(job["owner"])+"-"+str(job["id"])+"-"+uuid.uuid4().hex+".jpg")


def backfill_existing_thumbnail(connection, client):
    """Produce one thumbnail for an already-ready video, without changing rewards or playback."""
    with connection.transaction():
        row=connection.execute("""
            SELECT p.id,p.video_url,p.video_redacted_url,bp.user_id
            FROM business_profile_projects p
            JOIN business_profiles bp ON bp.id=p.business_profile_id
            WHERE p.is_published=TRUE AND p.video_redaction_status='ready'
              AND p.video_url=p.video_redaction_source_url
              AND p.video_redacted_url LIKE 'private-object-s3:business-project-redacted/%'
              AND (p.video_thumbnail_url IS NULL
                OR p.video_thumbnail_source_url IS DISTINCT FROM p.video_url)
            ORDER BY p.id LIMIT 1
        """).fetchone()
    if not row:
        return False
    project_id,source,derivative,owner=row
    key=derivative[len(PREFIX):]
    if not key.startswith("business-project-redacted/") or key.count("/")!=1:
        raise RuntimeError("Invalid backfill playback derivative")
    bucket=os.environ["PRIVATE_OBJECT_STORAGE_BUCKET"]
    new_key=thumbnail_key({"owner":owner,"id":project_id})
    with tempfile.TemporaryDirectory(prefix="propulse-thumb-") as folder:
        mp4=Path(folder)/"playback.mp4"
        jpeg=Path(folder)/"thumbnail.jpg"
        client.download_file(bucket,key,str(mp4))
        seconds=generate_thumbnail(mp4,jpeg)
        client.upload_file(str(jpeg),bucket,new_key,
            ExtraArgs={"ContentType":"image/jpeg","CacheControl":"private,no-store"})
    reference=PREFIX+new_key
    try:
        with connection.transaction():
            updated=connection.execute("""
                UPDATE business_profile_projects
                SET video_thumbnail_url=%s,video_thumbnail_source_url=%s,
                    video_thumbnail_generated_at=now(),video_duration_seconds=%s
                WHERE id=%s AND video_url=%s AND video_redacted_url=%s
                  AND is_published=TRUE AND video_redaction_status='ready'
                  AND video_redaction_source_url=video_url
                  AND (video_thumbnail_url IS NULL
                    OR video_thumbnail_source_url IS DISTINCT FROM video_url)
                RETURNING id
            """,(reference,source,seconds,project_id,source,derivative)).fetchone()
        if not updated:
            client.delete_object(Bucket=bucket,Key=new_key)
            LOG.info("Thumbnail backfill skipped for changed project %s",project_id)
        else:
            LOG.info("Backfilled video thumbnail and duration for completed project %s",project_id)
    except Exception:
        client.delete_object(Bucket=bucket,Key=new_key)
        raise
    return True


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
        raise RuntimeError("Video is larger than the %d MB processing limit" % (MAX_BYTES // (1024 * 1024)))
    # Legacy R2 prefix and database fields retained for compatibility.
    derivative_key=("business-project-redacted/"
        +str(job["owner"])+"-"+str(job["id"])+"-"+uuid.uuid4().hex+".mp4")
    with tempfile.TemporaryDirectory(prefix="propulse-video-") as folder:
        original=Path(folder)/"input"
        processed=Path(folder)/"playback.mp4"
        thumbnail=Path(folder)/"thumbnail.jpg"
        client.download_file(bucket,source_key,str(original))
        if original.stat().st_size != size:
            raise RuntimeError("Downloaded video changed during processing")
        settings=load_settings(connection)
        stats=transcode(original,processed,settings)
        duration_seconds=generate_thumbnail(processed,thumbnail)
        if processed.stat().st_size<1024:
            raise RuntimeError("Empty processed video")
        if not active_job(connection,job):
            LOG.warning("Abandoned stale project %s; upload skipped", job["id"])
            return
        thumbnail_key_value=thumbnail_key(job)
        client.upload_file(str(processed),bucket,derivative_key,
            ExtraArgs={"ContentType":"video/mp4","CacheControl":"private,no-store"})
        try:
            client.upload_file(str(thumbnail),bucket,thumbnail_key_value,
                ExtraArgs={"ContentType":"image/jpeg","CacheControl":"private,no-store"})
        except Exception:
            client.delete_object(Bucket=bucket,Key=derivative_key)
            raise
    reference_out=PREFIX+derivative_key
    thumbnail_reference=PREFIX+thumbnail_key_value
    try:
        with connection.transaction():
            updated=connection.execute("""
            UPDATE business_profile_projects
               SET video_redaction_status='ready',
                   video_redaction_source_url=%s,
                   video_redacted_url=%s,
                   video_thumbnail_url=%s,
                   video_thumbnail_source_url=%s,
                   video_thumbnail_generated_at=now(),
                   video_duration_seconds=%s,
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
        """,(reference,reference_out,thumbnail_reference,reference,
             duration_seconds,job["id"],reference,job["token"])).fetchone()
    except Exception:
        client.delete_object(Bucket=bucket,Key=derivative_key)
        client.delete_object(Bucket=bucket,Key=thumbnail_key_value)
        raise
    if not updated:
        client.delete_object(Bucket=bucket,Key=derivative_key)
        client.delete_object(Bucket=bucket,Key=thumbnail_key_value)
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
                    if backfill_existing_thumbnail(connection,client):
                        LOG.info("Prepared one existing video thumbnail without reprocessing video")
                    else:
                        LOG.info("No pending project videos or missing thumbnails")
                    if run_once:
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
