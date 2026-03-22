/**
 * Validates data/products.json: parse, required fields, image files on disk,
 * no duplicate image paths, JSON image set matches source folder *.webp set.
 *
 * Usage: node scripts/validate-products.js
 */
const fs = require("node:fs");
const path = require("node:path");

const ROOT = process.cwd();
const JSON_PATH = path.join(ROOT, "data", "products.json");
const SOURCE_DIR = path.join(ROOT, "Selected_procduct_pic_white_background");
const ASSETS_DIR = path.join(ROOT, "assets", "images", "Selected_procduct_pic_white_background");

function main() {
  let raw;
  try {
    raw = fs.readFileSync(JSON_PATH, "utf8");
  } catch (e) {
    console.error("Cannot read", JSON_PATH, e.message);
    process.exit(1);
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    console.error("Invalid JSON:", e.message);
    process.exit(1);
  }

  const products = data.products;
  if (!Array.isArray(products)) {
    console.error('Expected { "products": [ ... ] }');
    process.exit(1);
  }

  const errors = [];
  const warnings = [];
  const images = [];
  const seen = new Map();

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    const prefix = `products[${i}] (${p?.id ?? "?"})`;
    const required = ["id", "sku", "category", "categoryLabel", "name", "image"];
    for (const key of required) {
      if (p[key] == null || p[key] === "") {
        errors.push(`${prefix}: missing "${key}"`);
      }
    }
    const img = p.image;
    if (typeof img === "string" && img.startsWith("assets/images/")) {
      const rel = img.replace(/^assets\/images\//, "");
      const base = path.basename(rel);
      images.push(base);

      if (seen.has(img)) {
        errors.push(`${prefix}: duplicate image path (also ${seen.get(img)})`);
      } else {
        seen.set(img, p.id);
      }

      const src = path.join(ROOT, rel);
      const sourceCopy = path.join(SOURCE_DIR, base);
      if (!fs.existsSync(src)) {
        errors.push(`${prefix}: missing file assets/images/.../${base}`);
      }
      if (!fs.existsSync(sourceCopy)) {
        warnings.push(`${prefix}: missing source copy at Selected_procduct_pic_white_background/${base} (needed for npm run assets:used)`);
      }
    } else if (img) {
      errors.push(`${prefix}: image must start with assets/images/`);
    }
  }

  // Folder vs JSON: same set of basenames
  let onDisk = [];
  if (fs.existsSync(SOURCE_DIR)) {
    onDisk = fs
      .readdirSync(SOURCE_DIR)
      .filter((f) => f.endsWith(".webp"))
      .sort();
  } else {
    warnings.push(`Source folder missing: ${SOURCE_DIR}`);
  }

  const fromJson = [...new Set(images)].sort();
  const onlyJson = fromJson.filter((f) => !onDisk.includes(f));
  const onlyDisk = onDisk.filter((f) => !fromJson.includes(f));

  if (onlyJson.length) {
    errors.push(`Images in JSON but not on disk in source folder: ${onlyJson.join(", ")}`);
  }
  if (onlyDisk.length) {
    warnings.push(`WebP files on disk not used in JSON (orphans): ${onlyDisk.join(", ")}`);
  }

  console.log(`Products: ${products.length}`);
  console.log(`Unique images in JSON: ${fromJson.length}`);

  if (warnings.length) {
    console.warn("\nWarnings:");
    warnings.forEach((w) => console.warn(" -", w));
  }

  if (errors.length) {
    console.error("\nErrors:");
    errors.forEach((e) => console.error(" -", e));
    process.exit(1);
  }

  console.log("\nOK: JSON valid, images match source folder, no duplicate image paths.");
}

main();
