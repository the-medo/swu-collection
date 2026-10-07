import { expect, spyOn, test } from 'bun:test';
import sharp from 'sharp';
import { createUserHeaderService } from './service.ts';
import { UserFileError } from '../user-files/errors.ts';
import type { UserHeaderInput } from '../../../types/UserHeader.ts';

const fileId = crypto.randomUUID();
const input: UserHeaderInput = {
  source: 'upload',
  fileId,
  crop: { left: 0, top: 0, width: 1600, height: 400 },
};
test('header writes use unique objects; failed writes and persistence preserve the previous header', async () => {
  const bytes = await sharp({
    create: { width: 1800, height: 800, channels: 3, background: '#abc' },
  })
    .webp()
    .toBuffer();
  const objects = new Map<string, Uint8Array>();
  let key: string | null = null;
  let failPut = false,
    failPersist = false,
    available = true,
    fetches = 0;
  const save = createUserHeaderService({
    storage: {
      available: () => available,
      publicUrl: key => 'https://images.example.com/' + key,
      async put(next, body) {
        objects.set(next, body);
        if (failPut) throw new UserFileError('R2 failed.', 502);
      },
      async remove(key) {
        objects.delete(key);
      },
    },
    async resolveSource(owner, source) {
      return owner === 'owner' && source.source === 'upload' && source.fileId === fileId
        ? {
            source,
            name: 'Art',
            url: 'https://images.example.com/art.webp',
            width: 1800,
            height: 800,
          }
        : null;
    },
    async fetchSource() {
      fetches++;
      return bytes;
    },
    async persist(_owner, _input, next) {
      if (failPersist) throw new Error('Database failed.');
      const previous = key;
      key = next;
      return previous;
    },
  });
  const first = await save('owner', input);
  const originalKey = key;
  expect(first.source).toBe('upload');
  expect(objects.size).toBe(1);
  await expect(save('other-owner', input)).rejects.toMatchObject({ status: 404 });
  expect(fetches).toBe(1);
  failPut = true;
  await expect(save('owner', input)).rejects.toMatchObject({ status: 502 });
  expect(key).toBe(originalKey);
  expect(objects.size).toBe(1);
  failPut = false;
  failPersist = true;
  await expect(save('owner', input)).rejects.toThrow('Database failed');
  expect(key).toBe(originalKey);
  expect(objects.size).toBe(1);
  failPersist = false;
  const second = await save('owner', input);
  expect(second.image).not.toBe(first.image);
  expect(objects.size).toBe(1);
  expect(objects.has(originalKey!)).toBe(false);
  await save('owner', { source: 'battlefield' });
  expect(objects.size).toBe(0);
  expect(key).toBeNull();
  available = false;
  await expect(save('owner', input)).rejects.toMatchObject({ status: 503 });
  expect(await save('owner', { source: 'battlefield' })).toMatchObject({
    source: 'battlefield',
    image: null,
  });
});

test('failed or skipped cleanup keeps the exact object key in operator logs', async () => {
  const log = spyOn(console, 'error').mockImplementation(() => {});
  let available = false;
  const key = 'user-data/fixture/headers/deferred.webp';
  const save = createUserHeaderService({
    storage: {
      available: () => available,
      publicUrl: key => key,
      async put() {
        throw new Error('Unexpected upload');
      },
      async remove() {
        throw new Error('Deletion failed');
      },
    },
    async resolveSource() {
      return null;
    },
    async fetchSource() {
      throw new Error('Unexpected fetch');
    },
    async persist() {
      return key;
    },
  });
  try {
    await save('owner', { source: 'battlefield' });
    expect(log).toHaveBeenCalledWith(
      'Profile header object cleanup deferred: storage is not configured',
      { key },
    );
    available = true;
    await save('owner', { source: 'battlefield' });
    expect(log).toHaveBeenCalledWith('Profile header object cleanup failed', { key });
  } finally {
    log.mockRestore();
  }
});
