// Builds the responsive image set for every location's gallery.
//
// Sources live in media-src/<location>/ (full-resolution originals, never
// shipped) and are emitted into public/carousel_media/<location>/ as AVIF +
// WebP at a few widths, so the browser downloads roughly the pixels it actually
// paints instead of one fixed file for every screen.
//
// Run with:  node scripts/optimize-gallery.mjs [location ...]
// With no arguments it rebuilds every location found in media-src/.
// It prints the per-image widths and dominant colour that src/config/gallery.ts
// declares, so re-run it after adding a photo and copy the numbers over.
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const srcRoot = path.resolve('media-src');
const outRoot = path.resolve('public', 'carousel_media');

// Cards render ~330px wide (3-up in a 1024px container) and the lightbox tops
// out around 1200px, so 1600 is the largest width worth storing. Widths above
// the source resolution are skipped rather than upscaled.
const WIDTHS = [480, 800, 1600];

// Folders under media-src/ that aren't galleries.
const NOT_GALLERIES = new Set(['social']);

const requested = process.argv.slice(2);
const locations = (
  requested.length
    ? requested
    : fs
        .readdirSync(srcRoot, { withFileTypes: true })
        .filter((e) => e.isDirectory() && !NOT_GALLERIES.has(e.name))
        .map((e) => e.name)
).sort();

for (const location of locations) {
  const srcDir = path.join(srcRoot, location);
  const outDir = path.join(outRoot, location);
  if (!fs.existsSync(srcDir)) {
    console.error(`skipping ${location}: no ${path.relative(process.cwd(), srcDir)}`);
    continue;
  }
  fs.mkdirSync(outDir, { recursive: true });

  const files = fs.readdirSync(srcDir).filter((f) => /\.(jpe?g|png)$/i.test(f));
  const summary = [];
  console.log(`\n=== ${location} ===`);

  for (const file of files) {
    const slug = file.replace(/\.(jpe?g|png)$/i, '');
    const inputPath = path.join(srcDir, file);
    const { width: srcWidth, height: srcHeight } = await sharp(inputPath).rotate().metadata();
    const widths = WIDTHS.filter((w) => w <= srcWidth);
    if (widths.length === 0) widths.push(srcWidth);

    for (const width of widths) {
      const resized = sharp(inputPath).rotate().resize({ width, withoutEnlargement: true });
      await resized.clone().avif({ quality: 50, effort: 5 }).toFile(path.join(outDir, `${slug}-${width}.avif`));
      await resized.clone().webp({ quality: 78 }).toFile(path.join(outDir, `${slug}-${width}.webp`));
    }

    // Dominant colour, used as the card background until the photo decodes.
    const { dominant } = await sharp(inputPath).stats();
    const hex =
      '#' + [dominant.r, dominant.g, dominant.b].map((v) => v.toString(16).padStart(2, '0')).join('');

    const bytes = widths.flatMap((w) =>
      ['avif', 'webp'].map((ext) => fs.statSync(path.join(outDir, `${slug}-${w}.${ext}`)).size)
    );
    summary.push({ slug, widths, placeholder: hex });
    console.log(
      `${slug}: ${srcWidth}x${srcHeight} -> widths [${widths}] ` +
        `(${(fs.statSync(inputPath).size / 1024).toFixed(0)}kB source, ` +
        `${(Math.max(...bytes) / 1024).toFixed(0)}kB largest output) placeholder ${hex}`
    );
  }

  console.log(`\nConfig values for ${location}:\n` + JSON.stringify(summary, null, 2));
}
