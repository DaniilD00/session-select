// Transcodes the Instagram clips shown on the home page for the web.
//
// The originals are 2160x3840 (4K portrait) at ~25 Mbps, but they render in a
// card roughly 330px wide — about 1/6 the width. Serving them untouched cost
// ~78 MB and ~54 MB per play, which on GitHub Pages' 100 GB/month is only a few
// hundred plays. This emits 720x1280 H.264 (still 2x the rendered size, so it
// stays sharp on retina) plus a poster frame, so the card shows an image and
// downloads zero video bytes until someone presses play.
//
// Sources live in media-src/social/ and are never shipped.
// Requires ffmpeg on PATH.  Run with:  node scripts/optimize-social-videos.mjs
import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const run = promisify(execFile);

const srcDir = path.resolve('media-src', 'social');
const outDir = path.resolve('public', 'social');

// 720x1280 is 2x the ~330px card on retina; -crf 23 is visually transparent for
// this kind of footage, and faststart puts the index up front so playback can
// begin before the file finishes downloading.
const HEIGHT = 1280;
const CRF = 23;

const mb = (bytes) => (bytes / 1048576).toFixed(1);

const files = fs.readdirSync(srcDir).filter((f) => /\.(mp4|mov)$/i.test(f));
if (files.length === 0) {
  console.error(`No source videos in ${srcDir}`);
  process.exit(1);
}

for (const file of files) {
  const slug = file.replace(/\.(mp4|mov)$/i, '');
  const input = path.join(srcDir, file);
  const output = path.join(outDir, `${slug}.mp4`);
  const poster = path.join(outDir, `${slug}-poster.webp`);

  await run('ffmpeg', [
    '-y',
    '-i', input,
    // Even dimensions only — H.264 requires it after scaling.
    '-vf', `scale=-2:${HEIGHT}`,
    '-c:v', 'libx264',
    '-preset', 'slow',
    '-crf', String(CRF),
    '-profile:v', 'high',
    '-pix_fmt', 'yuv420p', // required for Safari/iOS
    '-c:a', 'aac',
    '-b:a', '96k',
    '-ac', '2',
    '-movflags', '+faststart',
    output,
  ]);

  // Poster pulled a second in, so it isn't a black lead-in frame.
  await run('ffmpeg', [
    '-y',
    '-ss', '1',
    '-i', input,
    '-frames:v', '1',
    '-vf', `scale=-2:${HEIGHT}`,
    '-q:v', '80',
    poster,
  ]);

  const before = fs.statSync(input).size;
  const after = fs.statSync(output).size;
  console.log(
    `${slug}: ${mb(before)} MB -> ${mb(after)} MB ` +
      `(-${(100 - (after / before) * 100).toFixed(1)}%), poster ${(fs.statSync(poster).size / 1024).toFixed(0)} kB`
  );
}
