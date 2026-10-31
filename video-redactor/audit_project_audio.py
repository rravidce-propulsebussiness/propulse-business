"""Safe metadata-only audio audit for a private ProPulse project video.

No audio, R2 keys, secret values, contact text or connection URLs are logged.
Requires the same credentials as the project video redaction worker.
"""
import contextlib
import json
import os
import subprocess
import tempfile
from pathlib import Path

import numpy as np
import psycopg

from worker import PREFIX, r2_client

PROJECT_ID = int(os.environ.get("VIDEO_AUDIO_DIAGNOSTIC_PROJECT_ID", "3"))


def audio_metrics(path):
    streams = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "a",
         "-show_entries", "stream=index,codec_name",
         "-of", "json", str(path)],
        capture_output=True, text=True, timeout=30, check=True)
    output = json.loads(streams.stdout)
    if not output.get("streams"):
        return {"track": False}
    stream = subprocess.run(
        ["ffmpeg", "-hide_banner", "-loglevel", "error", "-i", str(path),
         "-map", "0:a:0", "-vn", "-ac", "1", "-ar", "16000",
         "-f", "s16le", "pipe:1"],
        capture_output=True, timeout=150, check=True)
    samples = np.frombuffer(stream.stdout, dtype="<i2").astype(np.float32) / 32768.0
    if not samples.size:
        return {"track": True, "decoded": False}
    slice_size = 16000 // 4
    chunks = [samples[i:i+slice_size] for i in range(0,len(samples),slice_size)
              if len(samples[i:i+slice_size]) >= slice_size//2]
    rms = np.array([float(np.sqrt(np.mean(x*x))) for x in chunks])
    return {
        "track": True,
        "decoded": True,
        "duration_seconds": round(len(samples)/16000, 2),
        "overall_rms_dbfs": round(float(20*np.log10(max(1e-9, np.sqrt(np.mean(samples*samples))))), 2),
        "audible_quarters_above_minus_40db_percent": round(float(100*np.mean(rms >= 0.01)), 1),
        "loudest_quarter_dbfs": round(float(20*np.log10(max(1e-9, np.max(rms)))), 2)
    }


def main():
    dsn = os.getenv("DATABASE_URL")
    if not dsn:
        raise RuntimeError("Missing database credential")
    with psycopg.connect(dsn, connect_timeout=20) as connection:
        row=connection.execute("""SELECT video_url, video_redacted_url FROM
            business_profile_projects WHERE id=%s""", (PROJECT_ID,)).fetchone()
    if not row:
        raise RuntimeError("Project not found")
    r2=r2_client()
    bucket=os.environ["PRIVATE_OBJECT_STORAGE_BUCKET"]
    with tempfile.TemporaryDirectory(prefix="propulse-private-audio-audit-") as tmp:
        for label, reference in (("source", row[0]), ("redacted",row[1])):
            if not reference or not reference.startswith(PREFIX):
                print("Audio audit",label,{"available":False})
                continue
            key=reference[len(PREFIX):]
            if not (key.startswith("business-projects/") or
                    key.startswith("business-project-redacted/")):
                raise RuntimeError("Unexpected private video reference")
            local=Path(tmp)/(label+".mp4")
            r2.download_file(bucket,key,str(local))
            print("Audio audit",label,json.dumps(audio_metrics(local),sort_keys=True))


if __name__ == "__main__":
    main()
