# Photographic hero assets

The homepage has four scenes: `plot`, `build`, `home`, and `interior`.

The existing hero continues to use external stock photos until four owned/licensed images have been uploaded to Cloudflare R2 and a public URL has been verified. Do **not** enable the R2 base URL before then.

## Recommended production rollout

1. Export four consistently framed, licensed 1100px-or-wider landscape WebP images. Keep the same camera angle/subject alignment across scenes for smooth crossfades. Avoid embedding headings or CTA text inside the images.
2. Upload to R2 bucket `propulse-files` under `hero/plot.webp`, `hero/build.webp`, `hero/home.webp`, and `hero/interior.webp`.
3. Serve these objects through a dedicated verified public R2 domain (or an existing authenticated image proxy). The bucket currently has no custom public domain.
4. Check that all four URLs return HTTP 200 with `Content-Type: image/webp`, then set frontend build-time `VITE_HERO_MEDIA_BASE_URL=https://<verified-public-host>/hero` and redeploy.
5. Confirm the homepage on mobile and desktop, including all stage buttons, automatic crossfades, page speed, and a reduced-motion browser setting.
6. Roll back by removing `VITE_HERO_MEDIA_BASE_URL` and rebuilding; the existing stock-photo URLs remain the default.

**Note:** Vite `VITE_*` variables are injected at build time. Changing Hostinger environment variables without rebuilding does not change the frontend bundle.
