import { and, eq } from 'drizzle-orm';
import { db } from '../../db';
import { user } from '../../db/schema/auth-schema.ts';
import { userProfile } from '../../db/schema/user_profile.ts';
import { userFile } from '../../db/schema/user_file.ts';
import { imageGallery } from '../../db/schema/image_gallery.ts';
import type {
  HeaderImageOption,
  HeaderImageSource,
  UserHeader,
  UserHeaderInput,
  UserHeaderSettings,
} from '../../../types/UserHeader.ts';
import { createUserFileStorage, type UserFileObjectStorage } from '../user-files/storage.ts';
import { UserFileError } from '../user-files/errors.ts';
import { fetchHeaderSource } from './image.ts';
import { cleanupHeaderObject, storeCroppedHeader } from '../headers/storage.ts';

const battlefield: UserHeader = { source: 'battlefield', image: null, width: null, height: null };
type HeaderDependencies = {
  storage: UserFileObjectStorage;
  resolveSource(userId: string, source: HeaderImageSource): Promise<HeaderImageOption | null>;
  fetchSource(url: string): Promise<Uint8Array>;
  persist(userId: string, input: UserHeaderInput, key: string | null): Promise<string | null>;
};

export function createUserHeaderService(deps: HeaderDependencies) {
  return async (userId: string, input: UserHeaderInput): Promise<UserHeader> => {
    if (input.source === 'battlefield') {
      const previous = await deps.persist(userId, input, null);
      await cleanupHeaderObject(deps.storage, previous, 'Profile header');
      return { ...battlefield };
    }
    if (!deps.storage.available()) throw new UserFileError('Image storage is not configured.', 503);
    const image = await deps.resolveSource(userId, input);
    if (!image)
      throw new UserFileError(
        'This source image is no longer available. Choose another image.',
        404,
      );
    const owner = encodeURIComponent(userId).replace(/\./g, '%2E');
    const key = await storeCroppedHeader(deps.storage, {
      prefix: `user-data/${owner}/headers`,
      label: 'Profile header',
      url: image.url,
      crop: input.crop,
      fetchSource: deps.fetchSource,
      persist: key => deps.persist(userId, input, key),
    });
    return {
      source: input.source,
      image: deps.storage.publicUrl(key),
      width: input.crop.width,
      height: input.crop.height,
    };
  };
}

export async function resolveHeaderSource(
  userId: string,
  source: HeaderImageSource,
): Promise<HeaderImageOption | null> {
  const storage = createUserFileStorage();
  if (source.source === 'upload') {
    const [row] = await db
      .select()
      .from(userFile)
      .where(and(eq(userFile.id, source.fileId), eq(userFile.userId, userId)));
    return row
      ? {
          source,
          name: row.fileName,
          url: storage.publicUrl(row.imageKey),
          width: row.width,
          height: row.height,
        }
      : null;
  }
  const [row] = await db
    .select()
    .from(imageGallery)
    .where(eq(imageGallery.id, source.galleryImageId));
  return row
    ? {
        source,
        name: row.title,
        url: storage.publicUrl(row.imageKey),
        width: row.width,
        height: row.height,
      }
    : null;
}

export async function persistUserHeader(
  userId: string,
  input: UserHeaderInput,
  key: string | null,
) {
  return db.transaction(async tx => {
    const [owner] = await tx
      .select({ id: user.id })
      .from(user)
      .where(eq(user.id, userId))
      .for('key share');
    if (!owner) throw new UserFileError('User not found.', 404);
    await tx.insert(userProfile).values({ userId }).onConflictDoNothing();
    const [previous] = await tx
      .select({ key: userProfile.headerImageKey })
      .from(userProfile)
      .where(eq(userProfile.userId, userId))
      .for('update');
    const crop = input.source === 'battlefield' ? null : input.crop;
    await tx
      .update(userProfile)
      .set({
        headerSource: input.source,
        headerImageKey: key,
        headerFileId: input.source === 'upload' ? input.fileId : null,
        headerGalleryImageId: input.source === 'gallery' ? input.galleryImageId : null,
        headerLeft: crop?.left ?? null,
        headerTop: crop?.top ?? null,
        headerWidth: crop?.width ?? null,
        headerHeight: crop?.height ?? null,
      })
      .where(eq(userProfile.userId, userId));
    return previous.key;
  });
}

async function getHeaderRow(userId: string) {
  const [row] = await db
    .select({
      source: userProfile.headerSource,
      imageKey: userProfile.headerImageKey,
      fileId: userProfile.headerFileId,
      galleryImageId: userProfile.headerGalleryImageId,
      left: userProfile.headerLeft,
      top: userProfile.headerTop,
      width: userProfile.headerWidth,
      height: userProfile.headerHeight,
    })
    .from(user)
    .leftJoin(userProfile, eq(userProfile.userId, user.id))
    .where(eq(user.id, userId));
  if (!row) throw new UserFileError('User not found.', 404);
  return row;
}

function view(row: Awaited<ReturnType<typeof getHeaderRow>>): UserHeader {
  return row.imageKey
    ? {
        source: row.source ?? 'battlefield',
        image: createUserFileStorage().publicUrl(row.imageKey),
        width: row.width,
        height: row.height,
      }
    : { ...battlefield };
}

export async function getUserHeader(userId: string): Promise<UserHeader> {
  // Public projection deliberately excludes upload IDs, provenance and crop coordinates.
  return view(await getHeaderRow(userId));
}

export async function getUserHeaderSettings(userId: string): Promise<UserHeaderSettings> {
  const row = await getHeaderRow(userId);
  const source: HeaderImageSource | null =
    row.source === 'upload' && row.fileId
      ? { source: 'upload', fileId: row.fileId }
      : row.source === 'gallery' && row.galleryImageId
        ? { source: 'gallery', galleryImageId: row.galleryImageId }
        : null;
  return {
    header: view(row),
    selection: source ? await resolveHeaderSource(userId, source) : null,
    crop:
      row.left !== null && row.top !== null && row.width !== null && row.height !== null
        ? { left: row.left, top: row.top, width: row.width, height: row.height }
        : null,
  };
}

export const saveUserHeader = createUserHeaderService({
  storage: createUserFileStorage(),
  resolveSource: resolveHeaderSource,
  fetchSource: fetchHeaderSource,
  persist: persistUserHeader,
});
