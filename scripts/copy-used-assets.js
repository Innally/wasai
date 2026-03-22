/**
 * Copies only images referenced by the site from root category folders into assets/images/.
 * Run after moving WebPs to root folders or after updating products.json / index.html.
 */
const fs = require("node:fs/promises");
const path = require("node:path");

const ROOT = process.cwd();

const STATIC_USED = [
  // index.html — hero + mountains + factory (paths under assets/images/)
  "tea_mountain_and_trees/2023-08-27-202334.webp",
  "tea_mountain_and_trees/2023-08-27-202324.webp",
  "tea_mountain_and_trees/2023-08-27-211035.webp",
  "Self_owned_factory/2023-08-19-115614.webp",
  "Self_owned_factory/2023-08-27-202721.webp",
  "Self_owned_factory/2023-08-27-202819.webp",
];

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
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
