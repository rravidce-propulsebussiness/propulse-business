# ProPulse project video playback processor

**Policy:** Keep professionals' uploaded video and original sound as provided. Do not run automatic phone-number blur, OCR contact redaction, speech muting, or music replacement. Automatic methods were producing incorrect blur and altered sound. This change was requested for ProPulse project videos.

## How it works

- Original uploads remain **private** in Cloudflare R2 under `business-projects/`. Only a separately prepared playback derivative is eligible for public display.
- Already-browser-compatible H.264 video with AAC audio is **stream-copied** to an MP4: original encoded picture and sound are retained bit-for-bit. Other formats are transcoded to H.264/AAC for supported playback, with **no censorship, blur or added sound**. Files without an audio track remain silent.
- For database and API compatibility the derivative continues to be stored under the historical `business-project-redacted/` key and uses existing `video_redaction_* ` fields. These legacy identifiers do **not** indicate masking is still active.
- The backend must still check that the project is public, source-matched and processed successfully before providing its private derivative by signed URL. No source R2 objects are publicly readable.
- Reward credit still needs admin approval and duplicate detection. Playing a processed video does not grant credit. Admins should check genuine completed work.

## Contact details and business implications

**No automatic concealment is applied.** Any phone number, WhatsApp number, email, social profile, QR code, URL or spoken contact information in the uploaded video will remain visible or audible to public viewers. ProPulse sells leads and professional memberships; letting professionals put direct contact details into public project videos may allow prospects to bypass the paid lead process. Require professionals to remove sensitive or direct contact details **before uploading** or manually edit the video before publication. Do not promise automatic privacy protection.

## Worker setup

The separate GitHub Actions workflow `.github/workflows/project-video-redaction.yml` processes one pending video on schedule or when triggered. It uses five existing `PROPULSE_VIDEO_*` secrets: `PROPULSE_VIDEO_DATABASE_URL`, `PROPULSE_VIDEO_R2_ENDPOINT`, `PROPULSE_VIDEO_R2_BUCKET`, `PROPULSE_VIDEO_R2_ACCESS_KEY_ID`, `PROPULSE_VIDEO_R2_SECRET_ACCESS_KEY`. The Python entry point remains `video-redactor/worker.py` for compatibility. `DATABASE_URL` in the worker is separate from Hostinger's backend database configuration.

Requirements: Python 3.12, FFmpeg/FFprobe, `pip install -r video-redactor/requirements.txt`. The host can alternatively run `docker compose -f video-redactor/compose.yaml up -d --build`. Run `python -m unittest discover -s video-redactor -p 'test_*.py' -v` before deploy.

## Reprocessing

A prior blurred/re-soundtracked derivative must be regenerated from its original private R2 upload to remove processing artifacts. Set the existing video's `video_redaction_status` to `pending` and clear the old source-match/derivative references (with the original video unchanged), then run the worker. During processing or on failure the video remains unavailable to public playback. Once prepared, a new UUID-named derivative replaces the public playback reference. Lead-credit review remains separate. Preserve historical records and do not alter reward approval merely to reprocess a video.

### Production reprocessing verification

The pipeline must report a newly prepared derivative for the queued project, followed by an audio audit where the output's audio matches the original. If the worker reports `No pending project videos to process` because the project was queued after its pickup time, trigger the workflow again after queuing; do not republish an old blurred or music-replaced derivative.
