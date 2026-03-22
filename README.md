# WASAI Tea — static site

## Images layout

- **Category folders at repo root** (`tea_mountain_and_trees/`, `Self_owned_factory/`, etc.) hold the full set of **WebP** files. Original camera files (HEIC/JPG/…) should be removed after conversion; add new masters here, then convert.
- **`assets/images/`** contains **only images referenced by the site** (homepage + `data/products.json`) so deploy / git stays small.

Workflow when you add new photos:

```bash
npm run convert-images   # writes .webp into each category folder (skips existing .webp)
npm run assets:used      # refreshes assets/images/ from the manifest in scripts/copy-used-assets.js + products.json
```

To add a new product image: put a **WebP with an English-only filename** (ASCII, kebab-case, e.g. `raw-puer-xiaohusai-cake.webp`) in `Selected_procduct_pic_white_background/`, add the path under `image` in `data/products.json`, register the Chinese label in `data/product-image-map.json` if you need to keep the old naming for reference, add the path to `STATIC_USED` in `scripts/copy-used-assets.js` if it’s used on `index.html`, then run `npm run assets:used`.

**Why English filenames:** URLs, some CDNs, and older tooling handle non-ASCII paths less predictably. Chinese product names stay in `products.json` and in `data/product-image-map.json` (`chineseFile` ↔ `englishFile` per SKU / `productId`).

## Video hero

Real-time tea making / gongfu clips live in `assets/video/`. The homepage hero plays them **in a loop** (playlist in [`js/main.js`](js/main.js) as `HERO_VIDEO_PLAYLIST`).

If a browser cannot play a clip (often **`.mov`** outside Safari), the hero falls back to the tea-mountain **image slideshow**. For Chrome on Windows, add H.264 **`.mp4`** and point the playlist to those files.

## Git / size

`.gitignore` keeps the **bulk category folders** off the remote if you want a light repo; **`assets/images/`** (minimal) is intended to be committed. Adjust `.gitignore` if you prefer to track full WebP libraries.

## Deploy (Cloudflare Pages)

Connect this folder or push the repo. Internal links use real files (`products.html`, `product-detail.html`, …).

### “Redirected you too many times” (ERR_TOO_MANY_REDIRECTS)

That usually comes from **Cloudflare** (not from this repo’s HTML):

1. **Duplicate rules** — If the Cloudflare dashboard has **Bulk redirects** or **Redirect rules** that send `/products` ↔ `/products.html` (or `http` ↔ `https` / `www` ↔ apex) in a circle, the browser loops. Remove or merge those rules so there is **only one** hop to the final URL.
2. **SSL/TLS** — For Pages, set SSL mode to **Full (strict)** and avoid **Flexible** SSL with redirects on the origin.
3. This project **does not** ship an `_redirects` file anymore; pretty URLs like `/products` are not rewritten—use **`/products.html`** (as the links already do).

If you later want `/products` without `.html`, add **one** redirect or rewrite in the Cloudflare dashboard and test in an incognito window.
