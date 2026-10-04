import { expect, test } from 'bun:test';
import { createUserFileStorage, userFileObjectKeys } from './storage.ts';
const credentials = {
  R2_ENDPOINT: 'https://storage.example.com',
  R2_ACCESS_KEY_ID: 'test-key',
  R2_SECRET_ACCESS_KEY: 'test-secret',
};
const fileId = 'bf6f0e53-e8d9-424b-8121-04825e4f9c9e';
const { imageKey, thumbnailKey } = userFileObjectKeys('owner', fileId);

test('new images and thumbnails share one owner folder with unique file IDs', () => {
  expect({ imageKey, thumbnailKey }).toEqual({
    imageKey: `user-files/owner/${fileId}.webp`,
    thumbnailKey: `user-files/owner/${fileId}-thumb.webp`,
  });
  expect(userFileObjectKeys('another-owner', fileId).imageKey).not.toBe(imageKey);
});

test('text user IDs stay in one folder and public URLs address the exact stored key', () => {
  const storage = createUserFileStorage({});
  for (const owner of ['user/with/slashes', '..', 'name with spaces', 'name%23?#', 'žluťoučký']) {
    const { imageKey } = userFileObjectKeys(owner, fileId);
    expect(imageKey.split('/')).toHaveLength(3);
    const url = new URL(storage.publicUrl(imageKey));
    expect(decodeURIComponent(url.pathname.slice(1))).toBe(imageKey);
    expect(url.search).toBe('');
    expect(url.hash).toBe('');
  }
});

test('every environment uses the existing R2 bucket domain without a storage-mode option', () => {
  for (const environment of ['local', 'development', 'test', 'production', undefined]) {
    const storage = createUserFileStorage({ ...credentials, ENVIRONMENT: environment });
    expect(storage.available()).toBe(true);
    expect(storage.publicUrl(imageKey)).toBe(`https://images.swubase.com/${imageKey}`);
    expect(storage.publicUrl(thumbnailKey)).toBe(`https://images.swubase.com/${thumbnailKey}`);
  }
});

test('missing R2 credentials disable writes without falling back to local storage', async () => {
  for (const environment of ['local', 'production']) {
    const storage = createUserFileStorage({ ENVIRONMENT: environment });
    expect(storage.available()).toBe(false);
    expect(storage.publicUrl(imageKey)).toBe(`https://images.swubase.com/${imageKey}`);
    await expect(storage.put(imageKey, new Uint8Array(1))).rejects.toMatchObject({ status: 503 });
    await expect(storage.remove(imageKey)).rejects.toMatchObject({ status: 503 });
  }
});
