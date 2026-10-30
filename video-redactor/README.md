# ProPulse automatic project-video redaction worker

This is a **separate CPU-heavy service**, not a Hostinger shared-web background timer. A new published video automatically enters the DB queue; this worker polls it and writes a separate R2 MP4. It automatically makes successfully processed video derivatives eligible for public playback. It **does not grant lead-credit rewards**.

### Protection

- OCR scans frames at up to five samples per second for phone numbers, emails, websites and social handles. QR codes are detected separately. Matches are blacked out after blurring; audio is **removed entirely** to prevent spoken contact details.
- Detection is fallible (moving/small/stylized text and frames between samples can be missed). Public playback no longer waits for a manual approval. Strongly discourage contact details in original uploads, monitor publication, and remove reported leaks promptly. Admin review of the processed video is required **only for lead-credit reward eligibility**.
- Original uploads remain private in `business-projects/`; public clients get signed links only to `business-project-redacted/` when processing completes, the source reference matches and the directory/project is public. Neither processing failures nor missing worker configurations fall back to the original.
- Already-uploaded videos enter processing without requiring re-upload. Lead-credit rewards still require an explicit admin decision; registration-only rewards are unaffected.

### Start the worker

1. Deploy the app/backend migration `20261030_zz_project_video_automatic_redaction.sql` on the ProPulse database first. The web backend normally runs migrations on startup when `RUN_MIGRATIONS_ON_STARTUP=true`.
2. Run the worker on an independent Docker-capable VPS/compute service with at least 2 vCPUs, ~3GB RAM and temporary disk space. **Hostinger Business Web Hosting alone will not run this Docker worker.**
3. Set `DATABASE_URL` to the backend's PostgreSQL connection string and `PRIVATE_OBJECT_STORAGE_ENDPOINT`, `PRIVATE_OBJECT_STORAGE_BUCKET`, `PRIVATE_OBJECT_STORAGE_ACCESS_KEY_ID`, `PRIVATE_OBJECT_STORAGE_SECRET_ACCESS_KEY` to the same R2 config (use a restricted R2 token granting read originals and write derivatives). Never commit credentials.
4. From this folder run `docker compose -f compose.yaml up -d --build`. Watch `docker compose -f compose.yaml logs -f project-video-redactor`.
5. Upload and publish a test project. Verify the public API returns no video URL while processing; when the redacted R2 derivative reaches `ready`, the public API returns only that derivative without waiting for reward approval. Confirm no original URL leaks, QR/contact overlays are masked, no audio track remains, and admin Lead Credit Reviews still control rewards.

A failed job stays private with an error; investigate and re-upload if needed. The worker automatically retries only jobs abandoned while processing. Production needs monitoring of failed/stuck jobs and worker health.

### Limitations

- The worker intentionally discards all audio, including music/narration. Speech-preserving transcription and selective muting can be added later.
- OCR sampling is **not a guarantee** of removing all contact details. There is residual privacy risk in automatic publication; regularly audit processed videos, remove leaks quickly, and instruct professionals not to include direct contact information.
- MP4/MOV/WebM uploads from R2 are supported; external links and legacy local videos remain private and are marked failed until re-uploaded.
- This is not enabled on the live website until the separate Docker worker has been deployed and the backend migration has run.
