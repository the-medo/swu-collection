import { expect, test } from 'bun:test';
import sharp from 'sharp';
import { cropHeader } from './image.ts';

const crop = { left: 400, top: 200, width: 1600, height: 400 };
async function image(width = 2400, height = 800) {
  return sharp({ create: { width, height, channels: 3, background: '#123456' } })
    .png()
    .toBuffer();
}

test('header cropping preserves coordinates and a minimum 4:1 ratio at low and high resolutions', async () => {
  const red = await sharp({
    create: { width: 400, height: 800, channels: 3, background: '#ff0000' },
  })
    .png()
    .toBuffer();
  const source = await sharp(await image())
    .composite([{ input: red, left: 0, top: 0 }])
    .png()
    .toBuffer();
  const output = await cropHeader(source, crop);
  expect(await sharp(output).metadata()).toMatchObject({
    width: 1600,
    height: 400,
    format: 'webp',
  });
  const [r, g, b] = await sharp(output)
    .extract({ left: 0, top: 0, width: 1, height: 1 })
    .raw()
    .toBuffer();
  expect(r).toBeLessThan(35);
  expect(g).toBeGreaterThan(40);
  expect(b).toBeGreaterThan(65);
  expect(
    await sharp(
      await cropHeader(source, { left: 400, top: 400, width: 2000, height: 400 }),
    ).metadata(),
  ).toMatchObject({ width: 2000, height: 400 });
  for (const [width, height] of [
    [4, 1],
    [800, 200],
    [1499, 374],
    [1500, 375],
    [1500, 300],
    [1503, 375],
    [1599, 399],
    [1604, 401],
    [2000, 500],
    [2400, 600],
  ]) {
    const valid = await cropHeader(source, { left: 0, top: 0, width, height });
    expect(await sharp(valid).metadata()).toMatchObject({ width, height });
  }
  for (const invalid of [
    { ...crop, width: 3, height: 1 },
    { ...crop, height: 401 },
    { ...crop, height: 0 },
    { ...crop, left: -1 },
    { ...crop, top: 401 },
    { ...crop, width: 2100 },
    { ...crop, width: 1500, height: 376 },
    { ...crop, width: 1500, height: 400 },
    { ...crop, width: 1503, height: 376 },
    { ...crop, width: 1599, height: 400 },
    { ...crop, width: 8193, height: 2048 },
    { ...crop, width: 8192, height: 2049 },
  ])
    await expect(cropHeader(source, invalid)).rejects.toMatchObject({ status: 400 });
  await expect(cropHeader(await image(1499), crop)).rejects.toMatchObject({ status: 400 });
  await expect(cropHeader(new TextEncoder().encode('<svg/>'), crop)).rejects.toMatchObject({
    status: 400,
  });
  const tall = await cropHeader(await image(1600, 9000), {
    left: 0,
    top: 8500,
    width: 1500,
    height: 375,
  });
  expect(await sharp(tall).metadata()).toMatchObject({ width: 1500, height: 375 });
  const small = await cropHeader(await image(800, 400), {
    left: 0,
    top: 0,
    width: 800,
    height: 200,
  });
  expect(await sharp(small).metadata()).toMatchObject({ width: 800, height: 200 });
});

test('the largest supported 4:1 header keeps its full resolution', async () => {
  const result = await cropHeader(await image(8192, 2048), {
    left: 0,
    top: 0,
    width: 8192,
    height: 2048,
  });
  expect(await sharp(result).metadata()).toMatchObject({ width: 8192, height: 2048 });
}, 15_000);

test('header coordinates use EXIF orientation and saved headers omit original metadata', async () => {
  const source = await sharp(await image(800, 2200))
    .jpeg()
    .withMetadata({ orientation: 6 })
    .toBuffer();
  const result = await cropHeader(source, crop);
  const metadata = await sharp(result).metadata();
  expect(metadata).toMatchObject({ width: 1600, height: 400 });
  expect(metadata.exif).toBeUndefined();
});
