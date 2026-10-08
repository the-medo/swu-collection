// bun frontend/scripts/generate-battlefield-planet-textures.ts
// Bake deterministic SVG noise once; lighting and zoom can reuse these pixels.
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright/test';
import sharp from 'sharp';
import { battlefieldPlanetTextures } from '../../shared/battlefield/planets.ts';

const directory = new URL('../src/assets/battlefield/planets/', import.meta.url);
await mkdir(directory, { recursive: true });
const textures = [
  ...Object.entries(battlefieldPlanetTextures).map(([name, texture]) => ({
    name,
    frequency: texture.frequency,
    seed: texture.seed,
    octaves: 3,
  })),
  { name: 'grain', frequency: 0.8, seed: 41, octaves: 2 },
];
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  for (const { name, frequency, seed, octaves } of textures) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 100 100"><filter id="noise" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="${frequency}" numOctaves="${octaves}" seed="${seed}" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter><rect width="100" height="100" filter="url(#noise)"/></svg>`;
    const png = await page.evaluate(async source => {
      const image = new Image();
      image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(source);
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 256;
      canvas.getContext('2d')!.drawImage(image, 0, 0);
      return canvas.toDataURL('image/png').split(',')[1];
    }, svg);
    const compact = await sharp(Buffer.from(png, 'base64'))
      .toColourspace('b-w')
      .png({ compressionLevel: 9, adaptiveFiltering: true })
      .toBuffer();
    await Bun.write(new URL(name + '.png', directory), compact);
  }
  console.log('Generated six 256px Battlefield planet noise tiles.');
} finally {
  await browser.close();
}
