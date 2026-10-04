import { expect, test } from 'bun:test';
import sharp from 'sharp';
import { cardList } from '../../db/lists.ts';
import { createUserAvatarService } from './service.ts';
import type { UserAvatarSource } from '../../../types/UserAvatar.ts';

const card = Object.values(cardList).find(
  c => c && Object.values(c.variants).some(v => v?.image.front),
)!;
const variant = Object.values(card.variants).find(v => v?.image.front)!;
const input = {
  cardId: card.cardId,
  variantId: variant.variantId,
  side: 'front' as const,
  crop: { left: 0, top: 0, size: 100 },
};

async function fixture(
  options: {
    available?: boolean;
    failUpload?: boolean;
    missingUser?: boolean;
    missingUpload?: boolean;
  } = {},
) {
  const source = await sharp({
    create: { width: 300, height: 419, channels: 3, background: '#456789' },
  })
    .png()
    .toBuffer();
  const calls: string[] = [];
  const uploads: { key: string; body: Buffer }[] = [];
  const updates: { id: string; image: string; source: UserAvatarSource }[] = [];
  const save = createUserAvatarService({
    storageAvailable: () => options.available !== false,
    getUpload: async (userId, fileId) => {
      calls.push(`upload-source:${userId}:${fileId}`);
      return options.missingUpload ? null : `https://images.swubase.com/user-files/${fileId}.webp`;
    },
    getCards: async () => {
      calls.push('catalog');
      return cardList;
    },
    fetchSource: async () => {
      calls.push('fetch');
      return source;
    },
    upload: async (key, body) => {
      calls.push('upload');
      if (options.failUpload) throw new Error('upstream credential details');
      uploads.push({ key, body });
    },
    updateProfile: async (id, image, source) => {
      calls.push('update');
      updates.push({ id, image, source });
      return !options.missingUser;
    },
  });
  return { save, calls, uploads, updates };
}

test('uploads cropped bytes to the user key before updating their profile', async () => {
  const { save, calls, uploads, updates } = await fixture();
  const first = await save('owner', input);
  expect(calls).toEqual(['catalog', 'fetch', 'upload', 'update']);
  expect(uploads[0]!.key).toBe('user-data/owner/avatar.webp');
  expect(await sharp(uploads[0]!.body).metadata()).toMatchObject({
    width: 256,
    height: 256,
    format: 'webp',
  });
  expect(updates).toEqual([
    {
      id: 'owner',
      image: first.image,
      source: { cardId: input.cardId, variantId: input.variantId, side: input.side },
    },
  ]);
  expect(first.image).toStartWith('https://images.swubase.com/user-data/owner/avatar.webp?v=');
  const second = await save('owner', input);
  expect(uploads[1]!.key).toBe(uploads[0]!.key);
  expect(second.image).not.toBe(first.image);
});

test('uploaded images use the authenticated owner and the same cropped avatar output', async () => {
  const { save, calls, uploads, updates } = await fixture();
  const fileId = crypto.randomUUID();
  const result = await save('owner', { fileId, crop: input.crop });
  expect(calls).toEqual([`upload-source:owner:${fileId}`, 'fetch', 'upload', 'update']);
  expect(await sharp(uploads[0]!.body).metadata()).toMatchObject({
    width: 256,
    height: 256,
    format: 'webp',
  });
  expect(updates).toEqual([{ id: 'owner', image: result.image, source: { fileId } }]);
});

test('missing or foreign uploads are rejected before fetching or changing the avatar', async () => {
  const { save, calls, uploads, updates } = await fixture({ missingUpload: true });
  const fileId = crypto.randomUUID();
  await expect(save('owner', { fileId, crop: input.crop })).rejects.toMatchObject({ status: 404 });
  expect(calls).toEqual([`upload-source:owner:${fileId}`]);
  expect(uploads).toEqual([]);
  expect(updates).toEqual([]);
});

test('missing storage fails before fetching images or changing the profile', async () => {
  const { save, calls } = await fixture({ available: false });
  await expect(save('owner', input)).rejects.toMatchObject({ status: 503 });
  expect(calls).toEqual([]);
});

test('upload failures preserve the existing profile and hide upstream errors', async () => {
  const { save, calls, updates } = await fixture({ failUpload: true });
  await expect(save('owner', input)).rejects.toMatchObject({
    status: 502,
    message: 'Could not save your avatar. Please try again.',
  });
  expect(calls).toEqual(['catalog', 'fetch', 'upload']);
  expect(updates).toEqual([]);
});

test('missing users return 404 instead of reporting a saved avatar', async () => {
  const { save } = await fixture({ missingUser: true });
  await expect(save('missing', input)).rejects.toMatchObject({ status: 404 });
});

test('unknown cards and out-of-bounds crops never reach storage', async () => {
  const { save, uploads, updates } = await fixture();
  await expect(save('owner', { ...input, cardId: 'missing' })).rejects.toMatchObject({
    status: 404,
  });
  await expect(
    save('owner', { ...input, crop: { left: 299, top: 0, size: 100 } }),
  ).rejects.toMatchObject({ status: 400 });
  expect(uploads).toEqual([]);
  expect(updates).toEqual([]);
});
