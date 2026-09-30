import { expect, test } from 'bun:test';
import { attachmentThumbnail, withAttachmentThumbnail } from './thumbnail.ts';

test('thumbnail work is bounded before reading files and releases its slot after failure', async () => {
  let release!: () => void;
  const hold = new Promise<void>(resolve => {
    release = resolve;
  });
  let reads = 0;
  let active = 0;
  let peak = 0;
  const first = withAttachmentThumbnail(async () => {
    reads++;
    await hold;
    throw new Error('Simulated storage failure');
  }).catch(error => error);
  const queued = Array.from({ length: 16 }, (_, i) =>
    withAttachmentThumbnail(async () => {
      reads++;
      active++;
      peak = Math.max(peak, active);
      await Promise.resolve();
      active--;
      return i;
    }),
  );
  try {
    await expect(
      withAttachmentThumbnail(async () => {
        reads++;
      }),
    ).rejects.toMatchObject({ status: 503 });
    expect(reads).toBe(1);
  } finally {
    release();
  }
  expect((await first).message).toBe('Simulated storage failure');
  expect(await Promise.all(queued)).toHaveLength(16);
  expect(reads).toBe(17);
  expect(peak).toBe(1);
  expect(await withAttachmentThumbnail(async () => 'recovered')).toBe('recovered');
});

test('decoder failures expose only a safe error', async () => {
  await expect(attachmentThumbnail(Buffer.from('PRIVATE invalid image'))).rejects.toThrow(
    'Could not generate an image preview.',
  );
});

test('expired thumbnail requests never read files or block later requests', async () => {
  let release!: () => void;
  const hold = new Promise<void>(resolve => {
    release = resolve;
  });
  const first = withAttachmentThumbnail(() => hold);
  let expiredRead = false;
  const expired = withAttachmentThumbnail(async () => {
    expiredRead = true;
  }).catch(error => error);
  try {
    expect(await expired).toMatchObject({ status: 503 });
    const next = withAttachmentThumbnail(async () => 'next');
    release();
    await first;
    expect(await next).toBe('next');
    expect(expiredRead).toBe(false);
  } finally {
    release();
    await first;
  }
}, 15_000);
