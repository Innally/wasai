const fs = require("node:fs/promises");
const path = require("node:path");
const heicConvert = require("heic-convert");
const sharp = require("sharp");

const ROOT = process.cwd();
const SOURCE_DIRS = [
  "founder_pic",
  "Selected_procduct_pic_white_background",
  "Self_owned_factory",
  "tea_mountain_and_trees",
];
const OUTPUT_ROOT = path.join(ROOT, "assets", "images");
const VALID_EXTENSIONS = new Set([".heic", ".jpg", ".jpeg", ".png", ".webp"]);

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function getFilesRecursively(dirPath) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolutePath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      const nestedFiles = await getFilesRecursively(absolutePath);
      files.push(...nestedFiles);
    } else {
      files.push(absolutePath);
    }
  }
  return files;
}

async function readHeicAsJpegBuffer(filePath) {
  const inputBuffer = await fs.readFile(filePath);
  return heicConvert({
    buffer: inputBuffer,
    format: "JPEG",
    quality: 1,
  });
}

async function convertFile(filePath, sourceDirName) {
  const ext = path.extname(filePath).toLowerCase();
  if (!VALID_EXTENSIONS.has(ext)) {
    return { status: "skipped", reason: "unsupported extension" };
  }

  const fileName = path.parse(filePath).name;
  const safeName = fileName.replace(/[^\w\-]+/g, "-").toLowerCase();
  const outputDir = path.join(OUTPUT_ROOT, sourceDirName);
  const outputFile = path.join(outputDir, `${safeName}.webp`);

  await ensureDir(outputDir);

  try {
    if (ext === ".heic") {
      const jpegBuffer = await readHeicAsJpegBuffer(filePath);
      await sharp(jpegBuffer).rotate().webp({ quality: 85 }).toFile(outputFile);
    } else {
      await sharp(filePath).rotate().webp({ quality: 85 }).toFile(outputFile);
    }
    return { status: "converted", outputFile };
  } catch (error) {
    return { status: "failed", error: error.message };
  }
}

async function run() {
  console.log("Starting asset conversion...");
  let converted = 0;
  let skipped = 0;
  let failed = 0;

  for (const dirName of SOURCE_DIRS) {
    const sourceDir = path.join(ROOT, dirName);
    try {
      const stats = await fs.stat(sourceDir);
      if (!stats.isDirectory()) {
        continue;
      }
    } catch {
      continue;
    }

    console.log(`\nProcessing ${dirName}...`);
    const files = await getFilesRecursively(sourceDir);
    for (const filePath of files) {
      const result = await convertFile(filePath, dirName);
      if (result.status === "converted") {
        converted += 1;
        console.log(`  ✓ ${path.basename(filePath)} -> ${path.relative(ROOT, result.outputFile)}`);
      } else if (result.status === "skipped") {
        skipped += 1;
      } else {
        failed += 1;
        console.log(`  ✗ ${path.basename(filePath)} (${result.error})`);
      }
    }
  }

  console.log("\nConversion complete.");
  console.log(`Converted: ${converted}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Failed: ${failed}`);
}

run().catch((error) => {
  console.error("Fatal conversion error:", error);
  process.exit(1);
});
