import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const mediaDir = path.resolve('public', 'social');
const files = fs.readdirSync(mediaDir);

for (const file of files) {
  if (file.match(/\.(jpe?g|png)$/i) && file.includes('IMG')) {
    const inputPath = path.join(mediaDir, file);
    const outputPath = path.join(mediaDir, file.replace(/\.(jpe?g|png)$/i, '.webp'));
    
    sharp(inputPath)
      .resize({ width: 800, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(outputPath)
      .then(() => {
        console.log(`Optimized ${file} to WebP`);
      })
      .catch(err => console.error(err));
  }
}
