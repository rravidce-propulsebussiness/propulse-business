"""Private R2 -> privacy-redacted R2. No original media is published.

This worker is fail-closed: processing does NOT grant public access. A
A completed, source-matched derivative becomes eligible for automatic public
playback. Lead-credit rewards still require separate admin review. Speech is automatically muted to protect spoken contact details, while non-speech
sound is preserved. Automatic detection is imperfect; professional review is needed.
"""
import contextlib
import logging
import os
import re
import subprocess
import tempfile
import time
import uuid
from pathlib import Path

import boto3
import cv2
import numpy as np
import psycopg
import pytesseract
import webrtcvad
from botocore.config import Config

LOG = logging.getLogger("propulse.video_redactor")
logging.basicConfig(level=os.environ.get("LOG_LEVEL", "INFO").upper())
PREFIX = "private-object-s3:"
MAX_BYTES = int(os.environ.get("VIDEO_REDACTOR_MAX_BYTES", str(750 * 1024 * 1024)))
MAX_SECONDS = int(os.environ.get("VIDEO_REDACTOR_MAX_SECONDS", "600"))
SCAN_FPS = 5
CONTACT = re.compile(
    r"(?<!\w)(?:https?://|www\.)[^\s]+"
    r"|(?<!\w)(?:wa\.me|t\.me)\s*/\s*[a-z0-9_+.-]+"
    r"|[\w.+-]+@[\w.-]+\.[a-z]{2,}"
    r"|(?<!\w)@[a-z0-9_.]{3,}\b"
    r"|(?<!\w)[a-z0-9_-]+(?:\s*[-.]\s*[a-z0-9_-]+)*\s*\.\s*(?:com|in|net|org|online|io|me)\b"
    r"|(?<!\w)\+?\d[\d\s().-]{7,}\d",
    re.I,
)


def sensitive_spans(text):
    """Find actual contacts, not generic headings such as 'Contact Us'."""
    for match in CONTACT.finditer(text):
        value = match.group(0)
        if re.match(r"^\+?\d", value):
            digits = re.sub(r"\D", "", value)
            if len(digits) < 10 or len(digits) > 15:
                continue
        yield match.span()


def contains_contact(text):
    return bool(list(sensitive_spans(" ".join(str(text).split()))))


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
    # Mask only OCR tokens that overlap the sensitive substring. Masking the
    # entire line concealed project titles, dimensions and ordinary captions.
    languages = os.getenv("VIDEO_REDACTOR_OCR_LANGS", "eng+tel")
    data = pytesseract.image_to_data(frame, lang=languages,
        config="--psm 11", output_type=pytesseract.Output.DICT)
    groups = {}
    for i, value in enumerate(data["text"]):
        if not str(value).strip():
            continue
        key = (data["block_num"][i], data["par_num"][i], data["line_num"][i])
        groups.setdefault(key, []).append(i)
    boxes = []
    for group in groups.values():
        words = [str(data["text"][i]) for i in group]
        spans = []
        pos = 0
        for word in words:
            spans.append((pos, pos + len(word)))
            pos += len(word) + 1
        line = " ".join(words)
        for start, end in sensitive_spans(line):
            matching = [index for index, (a, b) in enumerate(spans)
                        if a < end and b > start]
            if not matching:
                continue
            ids = [group[index] for index in matching]
            x = min(int(data["left"][i]) for i in ids)
            y = min(int(data["top"][i]) for i in ids)
            right = max(int(data["left"][i]) + int(data["width"][i]) for i in ids)
            bottom = max(int(data["top"][i]) + int(data["height"][i]) for i in ids)
            boxes.append((x, y, right, bottom))
    # QR payloads can embed contact details without any readable OCR.
    ok, decoded, points, _ = qr_detector.detectAndDecodeMulti(frame)
    if ok and points is not None:
        for candidate in points:
            coords = np.asarray(candidate)
            boxes.append((int(coords[:, 0].min()), int(coords[:, 1].min()),
                int(coords[:, 0].max()), int(coords[:, 1].max())))
    else:
        found, coords = qr_detector.detect(frame)
        if found and coords is not None:
            pts = np.asarray(coords).reshape(-1, 2)
            boxes.append((int(pts[:, 0].min()), int(pts[:, 1].min()),
                int(pts[:, 0].max()), int(pts[:, 1].max())))
    return boxes


def track_boxes(previous_gray, current_gray, boxes):
    """Follow masked text through unsampled frames rather than freezing masks."""
    if previous_gray is None or not boxes:
        return boxes
    height, width = current_gray.shape
    tracked = []
    for x1, y1, x2, y2 in boxes:
        mask = np.zeros(previous_gray.shape, dtype=np.uint8)
        a, b = max(0, x1), max(0, y1)
        c, d = min(width, x2), min(height, y2)
        if c <= a or d <= b:
            continue
        mask[b:d, a:c] = 255
        points = cv2.goodFeaturesToTrack(previous_gray, maxCorners=20,
            qualityLevel=0.02, minDistance=3, mask=mask)
        dx = dy = 0
        if points is not None and len(points) >= 3:
            next_points, status, _ = cv2.calcOpticalFlowPyrLK(
                previous_gray, current_gray, points, None,
                winSize=(21, 21), maxLevel=2)
            if next_points is not None and status is not None:
                valid = status.ravel().astype(bool)
                if valid.sum() >= 3:
                    delta = next_points[valid].reshape(-1, 2) - points[valid].reshape(-1, 2)
                    proposed = np.median(delta, axis=0)
                    if np.all(np.isfinite(proposed)) and np.max(np.abs(proposed)) < 45:
                        dx, dy = [int(round(n)) for n in proposed]
        tracked.append((x1 + dx, y1 + dy, x2 + dx, y2 + dy))
    return tracked


def conceal(frame, boxes):
    height, width = frame.shape[:2]
    for x1, y1, x2, y2 in boxes:
        # Expand around the glyphs, but do not cover unrelated nearby text.
        padx = max(14, min(35, (x2-x1)//9))
        pady = max(10, min(24, (y2-y1)//2))
        a, b = max(0, x1-padx), max(0, y1-pady)
        c, d = min(width, x2+padx), min(height, y2+pady)
        if c <= a or d <= b:
            continue
        roi = frame[b:d, a:c]
        # Irreversible downsampling + soft blur: unlike a simple Gaussian,
        # this destroys character detail instead of merely hiding edges.
        tiny = cv2.resize(roi, (max(1, (c-a)//40),
                                max(1, (d-b)//40)), interpolation=cv2.INTER_AREA)
        mosaic = cv2.resize(tiny, (c-a, d-b), interpolation=cv2.INTER_LINEAR)
        frame[b:d, a:c] = cv2.GaussianBlur(mosaic, (31, 31), 0)
    return frame


def sanitized_audio_filter(source_path):
    """Keep environmental sound/music, but silence detected speech.

    VAD cannot certify all spoken contacts are caught. Source audio never
    becomes public without speech suppression. A video with no audio keeps
    no track. Fail closed if audio cannot be decoded or analyzed.
    """
    probe = subprocess.run(["ffprobe", "-v", "error",
        "-select_streams", "a", "-show_entries", "stream=index",
        "-of", "csv=p=0", str(source_path)],
        stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=30, check=True)
    if not probe.stdout.strip():
        return False, None
    audio = subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error",
        "-i", str(source_path), "-vn", "-ac", "1", "-ar", "16000",
        "-f", "s16le", "pipe:1"], stdout=subprocess.PIPE,
        stderr=subprocess.PIPE, timeout=120)
    if audio.returncode != 0 or not audio.stdout:
        raise RuntimeError("Unable to analyze audio safely; public output withheld")
    vad = webrtcvad.Vad(0)  # aggressive about identifying speech, not preserving speech
    frame_bytes = 16000 * 30 // 1000 * 2
    flags = []
    levels = []
    for offset in range(0, len(audio.stdout)-frame_bytes+1, frame_bytes):
        chunk = audio.stdout[offset:offset+frame_bytes]
        try:
            flags.append(vad.is_speech(chunk, 16000))
        except Exception as exc:
            raise RuntimeError("Speech screening failed; public output withheld") from exc
        samples = np.frombuffer(chunk, dtype="<i2").astype(np.float32)
        levels.append(float(np.sqrt(np.mean(samples*samples))))
    # WebRTC VAD frequently flags pure continuous tones/music as speech.
    # A nearly stationary audio bed with no speech-like energy modulation
    # should remain audible. Exclude onset/offset frames from the estimate.
    for block in range(0, len(flags), 33):
        end = min(len(flags), block+33)
        stable = levels[block+4:max(block+4,end-4)]
        if len(stable) >= 20:
            mean = float(np.mean(stable))
            if mean > 200 and float(np.std(stable))/mean < 0.025:
                flags[block:end] = [False] * (end-block)
    starts = [i*0.03 for i, speech in enumerate(flags) if speech]
    if not starts:
        return True, None
    # Allow breathing room before/after words and merge adjacent speech regions.
    intervals = []
    for position in starts:
        a, b = max(0., position - 0.50), position + 0.53
        if intervals and a <= intervals[-1][1] + 0.30:
            intervals[-1] = (intervals[-1][0], max(intervals[-1][1], b))
        else:
            intervals.append((a, b))
    filters = [f"volume=0:enable='between(t,{a:.3f},{b:.3f})'"
               for a, b in intervals]
    return True, ",".join(filters)


def transcode(source_path, output_path):
    video = cv2.VideoCapture(str(source_path))
    if not video.isOpened():
        raise RuntimeError("Unable to decode uploaded video")
    fps = video.get(cv2.CAP_PROP_FPS)
    width, height = int(video.get(cv2.CAP_PROP_FRAME_WIDTH)), int(video.get(cv2.CAP_PROP_FRAME_HEIGHT))
    frames = video.get(cv2.CAP_PROP_FRAME_COUNT)
    if not np.isfinite(fps) or fps < 1 or fps > 120 or width < 32 or height < 32:
        raise RuntimeError("Invalid video dimensions or frame rate")
    duration = frames/fps if frames > 0 else 0
    if not duration or duration > MAX_SECONDS:
        raise RuntimeError("Video duration unsupported or too long for automatic redaction")
    scale = min(1., 1280/width, 720/height)
    w, h = max(2, int(width*scale)//2*2), max(2, int(height*scale)//2*2)
    has_audio, audio_filter = sanitized_audio_filter(source_path)
    args = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
        "-f", "rawvideo", "-pixel_format", "bgr24", "-video_size", f"{w}x{h}",
        "-framerate", str(fps), "-i", "pipe:0", "-i", str(source_path),
        "-map", "0:v:0"]
    if has_audio:
        args += ["-map", "1:a:0", "-c:a", "aac", "-b:a", "160k"]
        if audio_filter:
            args += ["-af", audio_filter]
    else:
        args += ["-an"]
    args += ["-c:v", "libx264", "-preset", "veryfast", "-crf", "21",
        "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(output_path)]
    proc = subprocess.Popen(args, stdin=subprocess.PIPE, stderr=subprocess.PIPE)
    detector = cv2.QRCodeDetector()
    scan_step = max(1, round(fps/SCAN_FPS))
    last_boxes = []
    previous_gray = None
    scans_without_detection = 0
    total = detections = 0
    try:
        while True:
            ok, frame = video.read()
            if not ok:
                break
            if w != width or h != height:
                frame = cv2.resize(frame, (w, h), interpolation=cv2.INTER_AREA)
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            if total % scan_step == 0:
                observed = detect_contact_boxes(frame, detector)
                if observed:
                    last_boxes = observed
                    scans_without_detection = 0
                elif scans_without_detection < 1:
                    last_boxes = track_boxes(previous_gray, gray, last_boxes)
                    scans_without_detection += 1
                else:
                    last_boxes = []
            else:
                last_boxes = track_boxes(previous_gray, gray, last_boxes)
            if last_boxes:
                detections += 1
                conceal(frame, last_boxes)
            proc.stdin.write(frame.tobytes())
            previous_gray = gray
            total += 1
            if total > fps * MAX_SECONDS:
                raise RuntimeError("Video exceeded maximum processing duration")
        proc.stdin.close()
        error = proc.stderr.read().decode("utf-8", errors="replace")[-1200:]
        code = proc.wait(timeout=90)
        if code or total < 1:
            raise RuntimeError("FFmpeg failed to generate redacted output: " + error)
        return dict(frames=total, masked_frames=detections,
            audio="non-speech preserved" if has_audio else "no source audio")
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
        LOG.info("Project %s processed for public playback; %s frames, %s masked, audio %s; reward review separate",
                 job["id"],stats["frames"],stats["masked_frames"],stats["audio"])


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
