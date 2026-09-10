// Builds the 1200x630 Open Graph cards used for link previews.
//
// The site previously pointed og:image at a 703x1330 portrait photo while
// declaring og:image:width/height as 1200x630, so Facebook and LinkedIn either
// cropped it badly or dropped the card entirely.
//
// Every source photo is portrait (9:16-ish) and the target is 1.91:1 landscape,
// so a straight crop throws away most of the frame and lands on bare tiles.
// Instead each card is a composite: the whole photo, letterboxed at full height
// over a blurred, darkened copy of itself. The venue stays recognisable and the
// canvas is filled.
//
// Run with:  node scripts/optimize-social-cards.mjs
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const outDir = path.resolve('public', 'social');

const W = 1200;
const H = 630;

const CARDS = [
  { out: 'og-solna.jpg', src: 'media-src/solna/solna-scoreboard-floor.jpg' },
  { out: 'og-ronneby.jpg', src: 'media-src/ronneby/ronneby-neon-floor.jpeg' },
];

for (const card of CARDS) {
  const srcPath = path.resolve(card.src);
  const outPath = path.join(outDir, card.out);

  // Blurred, slightly darkened fill so the letterbox bars read as deliberate
  // and the sharp photo in front keeps the contrast.
  const backdrop = await sharp(srcPath)
    .rotate()
    .resize(W, H, { fit: 'cover', position: 'centre' })
    .blur(28)
    .modulate({ brightness: 0.55 })
    .toBuffer();

  // The photo itself, full height, nothing cropped away.
  const foreground = await sharp(srcPath)
    .rotate()
    .resize({ height: H, fit: 'inside', withoutEnlargement: false })
    .toBuffer();

  await sharp(backdrop)
    .composite([{ input: foreground, gravity: 'centre' }])
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(outPath);

  const { width, height } = await sharp(outPath).metadata();
  console.log(`${card.out}: ${width}x${height}, ${(fs.statSync(outPath).size / 1024).toFixed(0)} kB`);
}
