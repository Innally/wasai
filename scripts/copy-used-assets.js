/**
 * Copies only images referenced by the site from root category folders into assets/images/.
 * Run after moving WebPs to root folders or after updating products.json / index.html.
 */
const fs = require("node:fs/promises");
const path = require("node:path");

const ROOT = process.cwd();

const STATIC_USED = [
  // index.html — factory gallery (paths under assets/images/)
  "Self_owned_factory/2023-08-19-115614.webp",
  "Self_owned_factory/2023-08-27-202721.webp",
  "Self_owned_factory/2023-08-27-202819.webp",
];

/**
 * Tea-mountain hero images are NOT bulk-copied from the root `tea_mountain_and_trees/` folder.
 * Curate WebPs directly under `assets/images/tea_mountain_and_trees/` (add/remove by hand).
 * `npm run assets:used` then refreshes `data/hero-mountain-slides.json` from that folder only.
 * To copy specific masters from root into assets, add lines like `tea_mountain_and_trees/foo.webp`
 * to STATIC_USED above, or copy files manually.
 */

/** Hero slideshow manifest = every *.webp in assets/images/tea_mountain_and_trees/ (sorted). */
async function listHeroSlidesFromAssets() {
  const dir = path.join(ROOT, "assets", "images", "tea_mountain_and_trees");
  try {
    const names = await fs.readdir(dir);
    return names
      .filter((f) => f.endsWith(".webp"))
      .sort()
      .map((f) => `assets/images/tea_mountain_and_trees/${f}`);
  } catch {
    return [];
  }
}

async function readProductImages() {
  const raw = await fs.readFile(path.join(ROOT, "data", "products.json"), "utf8");
  const data = JSON.parse(raw);
  return (data.products || []).map((p) => {
    const img = p.image || "";
    const prefix = "assets/images/";
    if (!img.startsWith(prefix)) {
      return null;
    }
    return img.slice(prefix.length);
  }).filter(Boolean);
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function copyFile(src, dest) {
  await ensureDir(path.dirname(dest));
  await fs.copyFile(src, dest);
}

async function run() {
  const fromProducts = await readProductImages();
  const relPaths = [...new Set([...STATIC_USED, ...fromProducts])];

  let copied = 0;
  let missing = [];

  for (const rel of relPaths) {
    const src = path.join(ROOT, rel);
    const dest = path.join(ROOT, "assets", "images", rel);
    try {
      await fs.access(src);
      await copyFile(src, dest);
      copied += 1;
      console.log("ok", rel);
    } catch {
      missing.push(rel);
    }
  }

  console.log(`\nCopied: ${copied}`);
  if (missing.length) {
    console.warn("Missing sources (copy from elsewhere or fix paths):", missing);
    process.exitCode = 1;
  }

  const heroSlides = await listHeroSlidesFromAssets();
  const heroJsonPath = path.join(ROOT, "data", "hero-mountain-slides.json");
  await fs.writeFile(heroJsonPath, `${JSON.stringify({ slides: heroSlides }, null, 2)}\n`, "utf8");
  console.log("wrote data/hero-mountain-slides.json", `(${heroSlides.length} slides from assets/images/tea_mountain_and_trees)`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
