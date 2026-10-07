import type { HeaderCrop } from '../../../types/UserHeader.ts';
import type { UserFileObjectStorage } from '../user-files/storage.ts';
import { cropHeader } from '../user-header/image.ts';

export async function cleanupHeaderObject(
  storage: UserFileObjectStorage,
  key: string | null,
  label: string,
) {
  if (!key) return;
  if (!storage.available()) {
    console.error(`${label} object cleanup deferred: storage is not configured`, { key });
    return;
  }
  try {
    await storage.remove(key);
  } catch {
    console.error(`${label} object cleanup failed`, { key });
  }
}

export async function storeCroppedHeader(
  storage: UserFileObjectStorage,
  options: {
    prefix: string;
    label: string;
    url: string;
    crop: HeaderCrop;
    fetchSource(url: string): Promise<Uint8Array>;
    persist(key: string): Promise<string | null>;
  },
) {
  const bytes = await cropHeader(await options.fetchSource(options.url), options.crop);
  // Unique objects prevent concurrent saves or cached URLs from showing another revision.
  const key = `${options.prefix}/${crypto.randomUUID()}.webp`;
  let previous: string | null;
  try {
    await storage.put(key, bytes);
    previous = await options.persist(key);
  } catch (error) {
    await cleanupHeaderObject(storage, key, options.label);
    throw error;
  }
  await cleanupHeaderObject(storage, previous, options.label);
  return key;
}
