/**
 * Re-encodes album art in public/covers to WebP, capped at 1000px, and points
 * data/albums.yml at the renamed files.
 *
 * Covers arrive at whatever size and format the source had — originally 115MB
 * across 176 files, most of it PNG at dimensions no view renders. This is the
 * process that produced the current set; run it after adding new art.
 *
 *   npm run optimise-covers            # convert, rename, rewrite the YAML
 *   npm run optimise-covers -- --dry-run   # report only, touch nothing
 *
 * Safe to re-run: a WebP already within the ceiling is left alone rather than
 * re-encoded, so repeated runs cannot compound lossy artefacts.
 *
 * Delivered bytes do not change — next/image re-encodes on the fly regardless.
 * This is about repo and deploy weight.
 */

import fs from "node:fs/promises";
import path from "node:path";

/** Long-edge ceiling. The largest view renders ~576 CSS px; this leaves retina headroom. */
const MAX = 1000;
/** Chosen against a trial of 800/1000px and AVIF: the size/compatibility sweet spot. */
const QUALITY = 82;

const COVERS = "public/covers";
const ALBUMS = "data/albums.yml";
const SOURCE_EXTENSIONS = new Set([
  ".avif",
  ".gif",
  ".jpeg",
  ".jpg",
  ".png",
  ".tif",
  ".tiff",
  ".webp",
]);

const dryRun = process.argv.includes("--dry-run");

// sharp ships as an optional dependency of Next rather than a direct one, so
// say something useful if the platform did not get a binary.
let sharp;
try {
  ({ default: sharp } = await import("sharp"));
} catch {
  console.error(
    "sharp is not available. It normally comes with next; try `npm install`.",
  );
  process.exit(1);
}

const kb = (bytes) => `${Math.round(bytes / 1024)}KB`;
const mb = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)}MB`;

const files = (await fs.readdir(COVERS))
  .filter((file) => SOURCE_EXTENSIONS.has(path.extname(file).toLowerCase()))
  .sort();

/** old filename -> new filename, for the YAML rewrite. */
const renames = new Map();
let converted = 0;
let before = 0;
let after = 0;
let skipped = 0;

for (const file of files) {
  const source = path.join(COVERS, file);
  const buffer = await fs.readFile(source);
  const { width, height } = await sharp(buffer).metadata();
  const isWebp = path.extname(file).toLowerCase() === ".webp";
  const oversized = Math.max(width, height) > MAX;

  // Already WebP and within the ceiling: re-encoding would only lose quality.
  if (isWebp && !oversized) {
    skipped++;
    continue;
  }

  const target = file.replace(/\.[^.]+$/, ".webp");
  const targetPath = path.join(COVERS, target);

  // Refuse to clobber a different file that already owns the .webp name.
  if (target !== file) {
    const taken = await fs.access(targetPath).then(
      () => true,
      () => false,
    );
    if (taken) {
      console.warn(
        `! ${file} skipped — ${target} already exists;` +
          ` delete it first to replace that cover`,
      );
      skipped++;
      continue;
    }
  }

  const output = await sharp(buffer)
    .resize({ width: MAX, height: MAX, fit: "inside", withoutEnlargement: true })
    .webp({ quality: QUALITY })
    .toBuffer();

  const { width: newWidth, height: newHeight } = await sharp(output).metadata();

  if (!dryRun) {
    await fs.writeFile(targetPath, output);
    if (target !== file) await fs.unlink(source);
  }

  renames.set(file, target);
  converted++;
  before += buffer.length;
  after += output.length;

  console.log(
    `  ${file} -> ${target}  ${width}x${height} ${kb(buffer.length)}` +
      ` -> ${newWidth}x${newHeight} ${kb(output.length)}`,
  );
}

// Point the YAML at the renamed files. Rewritten line by line rather than
// through js-yaml, which would reformat the whole hand-edited file.
let yamlUpdated = 0;
if (renames.size) {
  const original = await fs.readFile(ALBUMS, "utf8");
  const rewritten = original
    .split("\n")
    .map((line) => {
      const match = /^(\s*cover:\s*)(\S+)(\s*)$/.exec(line);
      if (!match) return line;
      const [, prefix, value, trailing] = match;
      const basename = path.basename(value);
      const renamed = renames.get(basename);
      // A file resized in place keeps its name; only a changed one needs the
      // path updating.
      if (!renamed || renamed === basename) return line;
      yamlUpdated++;
      return `${prefix}${path.dirname(value)}/${renamed}${trailing}`;
    })
    .join("\n");
  if (!dryRun && rewritten !== original) await fs.writeFile(ALBUMS, rewritten);
}

// Cross-check the YAML against the directory, so a missing or unused cover
// surfaces here rather than as a 404 in production.
const yamlText = await fs.readFile(ALBUMS, "utf8");
const referenced = new Set(
  [...yamlText.matchAll(/^\s*cover:\s*(\S+)\s*$/gm)].map(([, value]) =>
    path.basename(value),
  ),
);
const onDisk = new Set(await fs.readdir(COVERS));
const missing = [...referenced].filter((file) => !onDisk.has(file));
const orphans = files
  .map((file) => renames.get(file) ?? file)
  .filter((file) => !referenced.has(file));

console.log("");
if (converted) {
  console.log(
    `converted ${converted} file${converted === 1 ? "" : "s"}: ` +
      `${mb(before)} -> ${mb(after)} ` +
      `(${(100 - (after / before) * 100).toFixed(1)}% smaller)`,
  );
} else {
  console.log("nothing to convert — every cover is WebP within the ceiling");
}
console.log(`left alone: ${skipped}`);
console.log(`albums.yml cover paths rewritten: ${yamlUpdated}`);

if (missing.length) {
  console.log(`\nreferenced by albums.yml but not on disk: ${missing.join(", ")}`);
}
if (orphans.length) {
  console.log(
    `\non disk but referenced by no album: ${orphans.join(", ")}` +
      `\n  (an album using cover_external does not need a local file)`,
  );
}
if (dryRun) console.log("\n--dry-run: nothing was written");
