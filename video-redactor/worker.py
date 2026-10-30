"""Private R2 -> privacy-redacted R2. No original media is published.

This worker is fail-closed: processing does NOT grant public access. A
A completed, source-matched derivative becomes eligible for automatic public
playback. Lead-credit rewards still require separate admin review. Audio is
stripped to prevent spoken contact disclosure.
"""
import contextlib
import logging
import os
import re
import tempfile
import time
import uuid
from pathlib import Path

import boto3
import cv2
import numpy as np
import psycopg
import pytesseract
from botocore.config import Config

LOG = logging.getLogger("propulse.video_redactor")
logging.basicConfig(level=os.environ.get("LOG_LEVEL", "INFO").upper())
PREFIX = "private-object-s3:"
MAX_BYTES = int(os.environ.get("VIDEO_REDACTOR_MAX_BYTES", str(750 * 1024 * 1024)))
MAX_SECONDS = int(os.environ.get("VIDEO_REDACTOR_MAX_SECONDS", "600"))
SCAN_FPS = 5
CONTACT = re.compile(
    r"(?:\b(?:https?://|www\.|[a-z0-9_-]+\.(?:com|in|net|org|online)\b)"
    r"|\b(?:whatsapp|contact|call\s+us|phone|mobile|telegram|instagram|facebook|"
    r"youtube\s+channel|scan\s+to\s+(?:call|chat)|wa\.me|t\.me)\b"
    r"|(?:[\w.+-]+@[\w.-]+\.[a-z]{2,})"
    r"|(?:@[a-z0-9_.]{3,})"
    r"|(?:\+?\d[\d\s().-]{7,}\d))",
    re.I,
)


def contains_contact(text):
    value = " ".join(str(text).split())
    if not value:
        return False
    for match in CONTACT.finditer(value):
        raw = match.group(0)
        if re.match(r"\+?\d", raw):
            digits = re.sub(r"\D", "", raw)
            if 10 <= len(digits) <= 15:
                return True
        else:
            return True
    return False


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


def detect_contact_boxes(frame, qr_detector):
    height, width = frame.shape[:2]
    # Tesseract groups individual digits/words into single lines, so
    # numbers separated by spaces are detected and concealed together.
    languages = os.getenv("VIDEO_REDACTOR_OCR_LANGS", "eng+tel")
    data = pytesseract.image_to_data(frame, lang=languages,
        config="--psm 11", output_type=pytesseract.Output.DICT)
    groups = {}
    for i, text in enumerate(data["text"]):
        if not str(text).strip():
            continue
        key = (data["block_num"][i], data["par_num"][i], data["line_num"][i])
        groups.setdefault(key, []).append(i)
    boxes = []
    for group in groups.values():
        line = " ".join(str(data["text"][i]) for i in group)
        if not contains_contact(line):
            continue
        x = min(int(data["left"][i]) for i in group)
        y = min(int(data["top"][i]) for i in group)
        right = max(int(data["left"][i])+int(data["width"][i]) for i in group)
        bottom = max(int(data["top"][i])+int(data["height"][i]) for i in group)
        boxes.append((x, y, right, bottom))
    # QR code payloads can encode contact details without any visible text.
    ok, decoded, points, _ = qr_detector.detectAndDecodeMulti(frame)
    if ok and points is not None:
        for points_for_code in points:
            points_for_code = np.asarray(points_for_code)
            boxes.append((int(points_for_code[:, 0].min()),
                int(points_for_code[:, 1].min()),
                int(points_for_code[:, 0].max()),
                int(points_for_code[:, 1].max())))
    else:
        # Some OpenCV builds fail to decode small QR codes but detect bounds.
        found, coords = qr_detector.detect(frame)
        if found and coords is not None:
            pts = np.asarray(coords).reshape(-1, 2)
            boxes.append((int(pts[:, 0].min()), int(pts[:, 1].min()),
                int(pts[:, 0].max()), int(pts[:, 1].max())))
    return boxes


def conceal(frame, boxes):
    height, width = frame.shape[:2]
    for x1, y1, x2, y2 in boxes:
        # Generous padding masks full glyphs and improves tolerance to motion.
        padx = max(16, (x2-x1)//4)
        pady = max(12, (y2-y1)//2)
        a,b = max(0,x1-padx),max(0,y1-pady)
        c,d = min(width,x2+padx),min(height,y2+pady)
        if c<=a or d<=b:
            continue
        roi = frame[b:d,a:c]
        # Blur plus an opaque overlay: OCR false negatives are still possible,
        # but correctly detected numbers cannot be recovered by sharpening.
        cv2.GaussianBlur(roi, (51,51), 0, dst=roi)
        cv2.rectangle(frame, (a,b), (c,d), (19,27,40), -1)
    return frame


def transcode(source_path, output_path):
    import subprocess
    video = cv2.VideoCapture(str(source_path))
    if not video.isOpened():
        raise RuntimeError("Unable to decode uploaded video")
    fps = video.get(cv2.CAP_PROP_FPS)
    width, height = int(video.get(cv2.CAP_PROP_FRAME_WIDTH)), int(video.get(cv2.CAP_PROP_FRAME_HEIGHT))
    frames = video.get(cv2.CAP_PROP_FRAME_COUNT)
    if not np.isfinite(fps) or fps < 1 or fps > 120 or width<32 or height<32:
        raise RuntimeError("Invalid video dimensions or frame rate")
    duration = frames/fps if frames>0 else 0
    if not duration or duration>MAX_SECONDS:
        raise RuntimeError("Video duration unsupported or too long for automatic redaction")
    # Preserve aspect ratio while limiting worker memory/CPU.
    scale = min(1., 1280/width, 720/height)
    w,h = max(2,int(width*scale)//2*2),max(2,int(height*scale)//2*2)
    args=["ffmpeg","-hide_banner","-loglevel","error","-y",
          "-f","rawvideo","-pixel_format","bgr24","-video_size",f"{w}x{h}",
          "-framerate",str(fps),"-i","pipe:0",
          "-an","-c:v","libx264","-preset","veryfast","-crf","24",
          "-pix_fmt","yuv420p","-movflags","+faststart",str(output_path)]
    proc=subprocess.Popen(args,stdin=subprocess.PIPE,stderr=subprocess.PIPE)
    detector=cv2.QRCodeDetector()
    scan_step=max(1,round(fps/SCAN_FPS))
    last_boxes=[]
    total=0
    detections=0
    try:
        while True:
            ok, frame=video.read()
            if not ok:
                break
            if w!=width or h!=height:
                frame=cv2.resize(frame,(w,h),interpolation=cv2.INTER_AREA)
            # OCR on frequent samples; hold regions until next scan to cover
            # interstitial frames. Manual full-video review remains mandatory.
            if total%scan_step==0:
                last_boxes=detect_contact_boxes(frame,detector)
            if last_boxes:
                detections+=1
                conceal(frame,last_boxes)
            proc.stdin.write(frame.tobytes())
            total+=1
            if total>fps*MAX_SECONDS:
                raise RuntimeError("Video exceeded maximum processing duration")
        proc.stdin.close()
        error=proc.stderr.read().decode("utf-8",errors="replace")[-1200:]
        code=proc.wait(timeout=90)
        if code or total<1:
            raise RuntimeError("FFmpeg failed to generate redacted output: "+error)
        return dict(frames=total,masked_frames=detections,audio="removed")
    finally:
        video.release()
        if proc.poll() is None:
            proc.kill()
        with contextlib.suppress(Exception):
            proc.wait(timeout=3)
        with contextlib.suppress(Exception):
            proc.stderr.close()


def process_one(connection, client, job):
    reference=job["source"]
    if not reference.startswith(PREFIX+"business-projects/"):
        raise RuntimeError("Automatic video redaction requires a directly uploaded R2 project video")
    source_key=reference[len(PREFIX):]
    if "/" in source_key[len("business-projects/"):]:
        raise RuntimeError("Invalid source video key")
    bucket=os.environ["PRIVATE_OBJECT_STORAGE_BUCKET"]
    head=client.head_object(Bucket=bucket,Key=source_key)
    size=int(head.get("ContentLength",0))
    if not 12<=size<=MAX_BYTES:
        raise RuntimeError("Video size exceeds auto-redaction worker limit")
    derivative_key=("business-project-redacted/"
        +str(job["owner"])+"-"+str(job["id"])+"-"+uuid.uuid4().hex+".mp4")
    with tempfile.TemporaryDirectory(prefix="propulse-redact-") as folder:
        original=Path(folder)/"input"
        processed=Path(folder)/"redacted.mp4"
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
        LOG.info("Project %s processed for public playback; %s frames, %s masked, audio removed; reward review separate",
                 job["id"],stats["frames"],stats["masked_frames"])


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
                    LOG.exception("Project %s auto-redaction failed",job["id"])
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
