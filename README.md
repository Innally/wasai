# WASAI Tea — static site

## Video hero (optional)

1. Add a short loop to `assets/video/` (e.g. `hero-tea-art.mp4`).
2. In `index.html`, inside `#heroVideo`, uncomment the `<source>` lines and set the file name.

Without a video file, the hero uses a **Ken Burns–style slideshow** of tea mountain images.

## Images

Web-ready assets live under `assets/images/`. Original camera folders at the repo root are listed in `.gitignore` to keep the repository small for upload.

Re-convert after adding photos:

```bash
npm run convert-images
```

## Deploy (Cloudflare Pages)

Connect this folder or push the repo; `_redirects` is included for clean URLs.
