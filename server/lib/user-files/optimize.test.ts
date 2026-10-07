import { expect, test } from 'bun:test';
import sharp from 'sharp';
import { optimizeUserImage } from './optimize.ts';
import { withUserFileMutation } from './admission.ts';
import { maxUserFileBytes } from '../../../types/UserFile.ts';
import { createUserFileStorage } from './storage.ts';

test('optimizes, rotates, bounds dimensions and strips metadata from uploaded pixels', async () => {
  const input = await sharp({
    create: { width: 3200, height: 1600, channels: 4, background: '#abcdef80' },
  })
    .withMetadata({ orientation: 6 })
    .png()
    .toBuffer();
  const result = await optimizeUserImage(
    new File([new Uint8Array(input)], 'image.png', { type: 'text/plain' }),
  );
  expect(result.width).toBe(1280);
  expect(result.height).toBe(2560);
  const image = await sharp(result.image).metadata();
  expect(image.format).toBe('webp');
  expect(image.hasAlpha).toBe(true);
  expect(image.exif).toBeUndefined();
  expect(image.orientation).toBeUndefined();
  expect(result.image.length).toBeLessThan(input.length);
  expect(await sharp(result.thumbnail).metadata()).toMatchObject({
    format: 'webp',
    width: 200,
    height: 400,
  });
});

test('rejects invalid, executable, oversized, high-pixel and animated files', async () => {
  for (const bytes of [
    Buffer.from('<html>not an image</html>'),
    Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>'),
  ])
    await expect(
      optimizeUserImage(new File([new Uint8Array(bytes)], 'fake.png', { type: 'image/png' })),
    ).rejects.toMatchObject({ status: 400 });
  await expect(optimizeUserImage(new File([], 'empty.png'))).rejects.toMatchObject({ status: 400 });
  await expect(
    optimizeUserImage(new File([new Uint8Array(maxUserFileBytes + 1)], 'big.png')),
  ).rejects.toMatchObject({ status: 413 });
  const huge = await sharp({
    create: { width: 6500, height: 6500, channels: 3, background: '#fff' },
  })
    .png()
    .toBuffer();
  await expect(
    optimizeUserImage(new File([new Uint8Array(huge)], 'huge.png')),
  ).rejects.toMatchObject({
    status: 400,
  });
  const animated = await sharp(Buffer.from([...Array(12).fill(255), ...Array(12).fill(0)]), {
    raw: { width: 2, height: 4, channels: 3, pageHeight: 2 },
  })
    .gif({ loop: 0, delay: [100, 100] })
    .toBuffer();
  await expect(
    optimizeUserImage(new File([new Uint8Array(animated)], 'animation.gif')),
  ).rejects.toThrow('Animated images');
});

test('upload admission is bounded and releases slots after failures', async () => {
  let release!: () => void;
  const wait = new Promise<void>(resolve => {
    release = resolve;
  });
  const first = withUserFileMutation('first', 'upload', () => wait);
  await expect(
    withUserFileMutation('first', 'upload', async () => 'duplicate'),
  ).rejects.toMatchObject({
    status: 429,
  });
  const second = withUserFileMutation('second', 'upload', async () => {
    await wait;
    throw new Error('failure');
  }).catch(e => e);
  try {
    await expect(
      withUserFileMutation('third', 'upload', async () => 'unexpected'),
    ).rejects.toMatchObject({
      status: 429,
    });
    expect(await withUserFileMutation('deleting', 'delete', async () => 'deleted')).toBe('deleted');
  } finally {
    release();
  }
  await first;
  expect((await second).message).toBe('failure');
  expect(await withUserFileMutation('first', 'upload', async () => 'recovered')).toBe('recovered');
});

test('image storage requires R2 credentials in every environment', async () => {
  const storage = createUserFileStorage({ ENVIRONMENT: 'production' });
  expect(storage.available()).toBe(false);
  await expect(storage.put('user-files/test.webp', new Uint8Array(1))).rejects.toMatchObject({
    status: 503,
  });
  expect(createUserFileStorage({ ENVIRONMENT: 'local' }).available()).toBe(false);
});
test('header uploads preserve portrait resolution and accept smaller images without enlarging them', async () => {
  const bytes = await sharp({
    create: { width: 2000, height: 4000, channels: 3, background: '#abc' },
  })
    .png()
    .toBuffer();
  const file = new File([new Uint8Array(bytes)], 'portrait.png');
  expect(await optimizeUserImage(file)).toMatchObject({ width: 1280, height: 2560 });
  expect(await optimizeUserImage(file, { preserveWidth: 1500 })).toMatchObject({
    width: 1500,
    height: 3000,
  });
  const small = await sharp({
    create: { width: 1499, height: 800, channels: 3, background: '#abc' },
  })
    .png()
    .toBuffer();
  expect(
    await optimizeUserImage(new File([new Uint8Array(small)], 'small.png'), {
      preserveWidth: 1500,
    }),
  ).toMatchObject({ width: 1499, height: 800 });
});
