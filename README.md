# WASAI Tea — static site

## Images layout

- **Category folders at repo root** (`tea_mountain_and_trees/`, `Self_owned_factory/`, etc.) hold the full set of **WebP** files. Original camera files (HEIC/JPG/…) should be removed after conversion; add new masters here, then convert.
- **`assets/images/`** contains **only images referenced by the site** (homepage + `data/products.json`) so deploy / git stays small.

Workflow when you add new photos:

```bash
npm run convert-images   # writes .webp into each category folder (skips existing .webp)
npm run assets:used      # refreshes assets/images/ from the manifest in scripts/copy-used-assets.js + products.json
```

To add a new product image: put WebP in `Selected_procduct_pic_white_background/` (or convert first), update `data/products.json`, add the path to `STATIC_USED` in `scripts/copy-used-assets.js` if it’s used on `index.html`, then run `npm run assets:used`.

## Video hero

Real-time tea making / gongfu clips live in `assets/video/`. The homepage hero plays them **in a loop** (playlist in [`js/main.js`](js/main.js) as `HERO_VIDEO_PLAYLIST`).

If a browser cannot play a clip (often **`.mov`** outside Safari), the hero falls back to the tea-mountain **image slideshow**. For Chrome on Windows, add H.264 **`.mp4`** and point the playlist to those files.

## Git / size

`.gitignore` keeps the **bulk category folders** off the remote if you want a light repo; **`assets/images/`** (minimal) is intended to be committed. Adjust `.gitignore` if you prefer to track full WebP libraries.

## Deploy (Cloudflare Pages)

Connect this folder or push the repo; `_redirects` is included for clean URLs.
