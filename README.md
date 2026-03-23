# WASAI Tea — static site

## Images layout

- **Category folders at repo root** (`tea_mountain_and_trees/`, `Self_owned_factory/`, etc.) hold the full set of **WebP** files. Original camera files (HEIC/JPG/…) should be removed after conversion; add new masters here, then convert.
- **`assets/images/`** contains **only images referenced by the site** (homepage + `data/products.json`) so deploy / git stays small.

Workflow when you add new photos:

```bash
npm run convert-images   # writes .webp into each category folder (skips existing .webp)
npm run assets:used      # refreshes assets/images/ from the manifest in scripts/copy-used-assets.js + products.json
```

**Hero tea-mountain slideshow:** the set is **only** whatever `*.webp` files you keep in **`assets/images/tea_mountain_and_trees/`** (not auto-filled from the root `tea_mountain_and_trees/` library). After you add or remove images there, run `npm run assets:used` to regenerate **`data/hero-mountain-slides.json`** from that folder. Deleting a file from `assets/images/tea_mountain_and_trees/` and re-running `assets:used` removes it from the hero (nothing restores it from root unless you copy it again yourself or add its path to `STATIC_USED` in `scripts/copy-used-assets.js`).

To add a new product image: put a **WebP with an English-only filename** (ASCII, kebab-case, e.g. `raw-puer-xiaohusai-cake.webp`) in `Selected_procduct_pic_white_background/`, add the path under `image` in `data/products.json`, register the Chinese label in `data/product-image-map.json` if you need to keep the old naming for reference, add the path to `STATIC_USED` in `scripts/copy-used-assets.js` if it’s used on `index.html`, then run `npm run assets:used`.

**Why English filenames:** URLs, some CDNs, and older tooling handle non-ASCII paths less predictably. Chinese product names stay in `products.json` and in `data/product-image-map.json` (`chineseFile` ↔ `englishFile` per SKU / `productId`).

## Video hero

Real-time tea making / gongfu clips live in `assets/video/`. The homepage hero plays them **in a loop** (playlist in [`js/main.js`](js/main.js) as `HERO_VIDEO_PLAYLIST`).

If a browser cannot play a clip (often **`.mov`** outside Safari), the hero falls back to the tea-mountain **image slideshow**. For Chrome on Windows, add H.264 **`.mp4`** and point the playlist to those files.

## Git / size

`.gitignore` keeps the **bulk category folders** off the remote if you want a light repo; **`assets/images/`** (minimal) is intended to be committed. Adjust `.gitignore` if you prefer to track full WebP libraries.

## Deploy (Cloudflare Pages)

Connect this folder or push the repo. Internal links use real files (`products.html`, `product-detail.html`, …).

**Pages Functions + Stripe:** The repo includes `wrangler.toml` with **`nodejs_compat`** (required for the Stripe Node SDK). The **`stripe`** package is declared under **`functions/package.json`** and hoisted via npm **workspaces** so the deploy bundler can resolve it. Use a build step that installs dependencies, e.g. **Build command:** `npm ci` or `npm install` (and commit **`package-lock.json`**). If you still see “Could not resolve stripe”, confirm the install ran and that **Settings → Functions → Compatibility flags** includes **`nodejs_compat`** (should match `wrangler.toml`).

If the build log says **`No Wrangler configuration file found`**, Cloudflare did not see `wrangler.toml` next to your build: **commit and push** `wrangler.toml`, set **Settings → Builds → Root directory** to **`/`** (repo root) unless your app lives in a subfolder, and redeploy after the file is on the branch.

If you see **`Wrangler configuration file … does not appear to be valid`** / missing **`pages_build_output_dir`**, the repo `wrangler.toml` must include **`pages_build_output_dir`** (this project uses **`"."`** because static files live at the repo root). Align **Settings → Builds → Build output directory** with that, or change `pages_build_output_dir` if your build outputs to e.g. **`dist/`**.

### “Redirected you too many times” (ERR_TOO_MANY_REDIRECTS)

That usually comes from **Cloudflare** (not from this repo’s HTML):

1. **Duplicate rules** — If the Cloudflare dashboard has **Bulk redirects** or **Redirect rules** that send `/products` ↔ `/products.html` (or `http` ↔ `https` / `www` ↔ apex) in a circle, the browser loops. Remove or merge those rules so there is **only one** hop to the final URL.
2. **SSL/TLS** — For Pages, set SSL mode to **Full (strict)** and avoid **Flexible** SSL with redirects on the origin.
3. This project **does not** ship an `_redirects` file anymore; pretty URLs like `/products` are not rewritten—use **`/products.html`** (as the links already do).

If you later want `/products` without `.html`, add **one** redirect or rewrite in the Cloudflare dashboard and test in an incognito window.

### Stripe checkout setup (Pages Functions)

This project includes:

- `functions/api/checkout.js` -> creates Stripe Checkout sessions
- `functions/api/webhook.js` -> handles `checkout.session.completed`
- `success.html` and `cancel.html` -> customer return pages

Before enabling checkout, configure secrets and env:

- `STRIPE_SECRET_KEY` (required) -> Stripe secret API key (**Dashboard Secrets** or `wrangler secret put`)
- `STRIPE_WEBHOOK_SECRET` (required) -> webhook signing secret (`whsec_...`)
- `FORMSPREE_ENDPOINT` (optional) -> Formspree form URL for order emails from the webhook. This repo sets it in **`wrangler.toml`** under `[vars]`; change the URL there or override in the dashboard if your Pages project allows it.

Cloudflare dashboard path (for Stripe secrets):

1. **Workers & Pages** -> your project -> **Settings** -> **Variables and Secrets** (or **Environment variables**)
2. Add **Secrets** for `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` for **Production** (and **Preview** if you test there)
3. Redeploy after saving

Then, in Stripe dashboard:

1. Create a webhook endpoint at `https://<your-domain>/api/webhook`
2. Select event `checkout.session.completed`
3. Copy signing secret into `STRIPE_WEBHOOK_SECRET`

For local development with Wrangler, mirror these vars in `.dev.vars` (do not commit secrets).

### D1 order log (optional but recommended)

This project can store paid orders in Cloudflare D1:

- `db/schema.sql` -> table definition
- `functions/api/webhook.js` -> writes completed checkout sessions into D1
- `functions/api/admin/orders.js` -> protected read API
- `admin-orders.html` -> lightweight admin viewer

Cloudflare setup:

1. Create a D1 database (example name: `wasai-order`).
2. Apply schema:

```bash
# One-time: log in (opens browser)
npx wrangler login

# Apply schema to your *remote* D1 (replace DB name in package.json if not wasai-order)
npm run d1:apply-schema
```

Or manually: `npx wrangler d1 execute <YOUR_DB_NAME> --remote --file db/schema.sql`

3. **Bind D1 to Pages** (pick one):

   - **Via `wrangler.toml` (recommended if the dashboard says bindings are managed in Wrangler):**  
     Fill in **`database_id`** in **`[[d1_databases]]`** (UUID from **D1 → your database → Database ID**). Keep **`binding = "DB"`** and **`database_name`** matching the name you created (e.g. `wasai-order`). Commit and redeploy.

   - **Via Dashboard:** **Settings → Bindings → D1** → variable name **`DB`** → select your database.

4. Add an admin token env var:
   - `ADMIN_API_TOKEN` (required to call `/api/admin/orders`)

Admin usage:

- Open `admin-orders.html`
- Paste `ADMIN_API_TOKEN`
- Load / search orders

Security notes:

- Keep `admin-orders.html` private (not linked in public nav).
- Rotate `ADMIN_API_TOKEN` if shared.
- Never commit secrets to git.

## US compliance checklist (tea sales)

Payment setup is only part of launch readiness. For selling tea in the US, track this checklist:

- Confirm each product is classified and labeled as a **food** product (or appropriate category).
- Keep ingredient and allergen statements accurate and consistent with packaging.
- Ensure net quantity declarations and business identity are present on labels.
- Document supplier COAs / safety records (e.g., pesticide and contaminant checks).
- Determine whether your business qualifies for small-business nutrition-label exemptions.
- If making health-related claims, verify they are compliant and substantiated.
- Confirm facility registration / local permits as required for your supply chain.

Regulatory requirements can change by state and product type. Validate final labels and claims with qualified compliance counsel before large-scale launch.
