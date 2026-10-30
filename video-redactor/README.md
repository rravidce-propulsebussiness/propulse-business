# ProPulse automatic project-video redaction worker

This is a **separate CPU-heavy service**, not a Hostinger shared-web background timer. A new published video automatically enters the DB queue; this worker polls it and writes a separate R2 MP4. It **does not auto-approve videos**.

### Protection

- OCR scans frames at up to five samples per second for phone numbers, emails, websites and social handles. QR codes are detected separately. Matches are blacked out after blurring; audio is **removed entirely** to prevent spoken contact details.
- Detection is fallible (moving/small/stylized text and frames between samples can be missed). **The admin must watch the entire processed video** and confirm it is safe before any public playback or lead reward.
- Original uploads remain private in `business-projects/`; public clients get signed links only to `business-project-redacted/` after admin approval. Neither processing failures nor missing worker configurations fall back to the original.
- Previously approved videos require processing and a fresh admin check. The existing registration-only rewards are unaffected.

### Start the worker

1. Deploy the app/backend migration `20261030_zz_project_video_automatic_redaction.sql` on the ProPulse database first. The web backend normally runs migrations on startup when `RUN_MIGRATIONS_ON_STARTUP=true`.
2. Run the worker on an independent Docker-capable VPS/compute service with at least 2 vCPUs, ~3GB RAM and temporary disk space. **Hostinger Business Web Hosting alone will not run this Docker worker.**
3. Set `DATABASE_URL` to the backend's PostgreSQL connection string and `PRIVATE_OBJECT_STORAGE_ENDPOINT`, `PRIVATE_OBJECT_STORAGE_BUCKET`, `PRIVATE_OBJECT_STORAGE_ACCESS_KEY_ID`, `PRIVATE_OBJECT_STORAGE_SECRET_ACCESS_KEY` to the same R2 config (use a restricted R2 token granting read originals and write derivatives). Never commit credentials.
4. From this folder run `docker compose -f compose.yaml up -d --build`. Watch `docker compose -f compose.yaml logs -f project-video-redactor`.
5. Upload and publish a test project. Admin Expert Directory → Projects & Media shows `Processing` then `Ready for privacy review`. Check a phone-number overlay and QR code; verify the public APIs have no video URL before admin approval, and only the redacted R2 URL afterward. Verify no audio track remains.

A failed job stays private with an error; investigate and re-upload if needed. The worker automatically retries only jobs abandoned while processing. Production needs monitoring of failed/stuck jobs and worker health.

### Limitations

- The worker intentionally discards all audio, including music/narration. Speech-preserving transcription and selective muting can be added later.
- OCR sampling is **not a guarantee** of removing all contact details. Manual verification is mandatory.
- MP4/MOV/WebM uploads from R2 are supported; external links and legacy local videos remain private and are marked failed until re-uploaded.
- This is not enabled on the live website until the separate Docker worker has been deployed and the backend migration has run.
