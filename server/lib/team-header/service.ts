import { and, eq } from 'drizzle-orm';
import { db } from '../../db';
import { team } from '../../db/schema/team.ts';
import { teamMember } from '../../db/schema/team_member.ts';
import { teamHeader } from '../../db/schema/team_header.ts';
import type { TeamHeader, TeamHeaderInput, TeamHeaderSettings } from '../../../types/TeamHeader.ts';
import type { HeaderImageOption, HeaderImageSource } from '../../../types/UserHeader.ts';
import { createUserFileStorage, type UserFileObjectStorage } from '../user-files/storage.ts';
import { UserFileError } from '../user-files/errors.ts';
import { fetchHeaderSource } from '../user-header/image.ts';
import { resolveHeaderSource } from '../user-header/service.ts';
import { cleanupHeaderObject, storeCroppedHeader } from '../headers/storage.ts';

const empty: TeamHeader = { source: null, image: null, width: null, height: null };
type HeaderDependencies = {
  storage: UserFileObjectStorage;
  resolveSource(userId: string, source: HeaderImageSource): Promise<HeaderImageOption | null>;
  fetchSource(url: string): Promise<Uint8Array>;
  persist(
    teamId: string,
    userId: string,
    input: TeamHeaderInput,
    key: string | null,
  ): Promise<string | null>;
};

export function createTeamHeaderService(deps: HeaderDependencies) {
  return async (teamId: string, userId: string, input: TeamHeaderInput): Promise<TeamHeader> => {
    if (input.source === 'none') {
      const previous = await deps.persist(teamId, userId, input, null);
      await cleanupHeaderObject(deps.storage, previous, 'Team header');
      return { ...empty };
    }
    if (!deps.storage.available()) throw new UserFileError('Image storage is not configured.', 503);
    // A team owner's personal uploads remain private to that owner, even from other owners.
    const image = await deps.resolveSource(userId, input);
    if (!image)
      throw new UserFileError(
        'This source image is no longer available. Choose another image.',
        404,
      );
    const key = await storeCroppedHeader(deps.storage, {
      prefix: `teams/headers/${teamId}`,
      label: 'Team header',
      url: image.url,
      crop: input.crop,
      fetchSource: deps.fetchSource,
      persist: key => deps.persist(teamId, userId, input, key),
    });
    return {
      source: input.source,
      image: deps.storage.publicUrl(key),
      width: input.crop.width,
      height: input.crop.height,
    };
  };
}

export async function persistTeamHeader(
  teamId: string,
  userId: string,
  input: TeamHeaderInput,
  key: string | null,
) {
  return db.transaction(async tx => {
    // Share the membership-edit lock so ownership cannot change while publishing a header.
    const [existing] = await tx
      .select({ id: team.id })
      .from(team)
      .where(eq(team.id, teamId))
      .for('no key update');
    if (!existing) throw new UserFileError('Team not found.', 404);
    const [membership] = await tx
      .select({ role: teamMember.role })
      .from(teamMember)
      .where(and(eq(teamMember.teamId, teamId), eq(teamMember.userId, userId)))
      .for('share');
    if (membership?.role !== 'owner')
      throw new UserFileError('Only team owners can update the header.', 403);
    const [previous] = await tx
      .select({ key: teamHeader.imageKey })
      .from(teamHeader)
      .where(eq(teamHeader.teamId, teamId));
    if (input.source === 'none') {
      await tx.delete(teamHeader).where(eq(teamHeader.teamId, teamId));
    } else {
      if (!key) throw new Error('A cropped header object is required.');
      const data = {
        source: input.source,
        imageKey: key,
        fileId: input.source === 'upload' ? input.fileId : null,
        galleryImageId: input.source === 'gallery' ? input.galleryImageId : null,
        ...input.crop,
      };
      await tx
        .insert(teamHeader)
        .values({ teamId, ...data })
        .onConflictDoUpdate({ target: teamHeader.teamId, set: data });
    }
    return previous?.key ?? null;
  });
}

async function getHeaderRow(teamId: string) {
  const [row] = await db
    .select({
      source: teamHeader.source,
      imageKey: teamHeader.imageKey,
      fileId: teamHeader.fileId,
      galleryImageId: teamHeader.galleryImageId,
      left: teamHeader.left,
      top: teamHeader.top,
      width: teamHeader.width,
      height: teamHeader.height,
    })
    .from(team)
    .leftJoin(teamHeader, eq(teamHeader.teamId, team.id))
    .where(eq(team.id, teamId));
  if (!row) throw new UserFileError('Team not found.', 404);
  return row;
}

function view(row: Awaited<ReturnType<typeof getHeaderRow>>): TeamHeader {
  return row.imageKey
    ? {
        source: row.source,
        image: createUserFileStorage().publicUrl(row.imageKey),
        width: row.width,
        height: row.height,
      }
    : { ...empty };
}

export async function getTeamHeader(teamId: string): Promise<TeamHeader> {
  return view(await getHeaderRow(teamId));
}

export async function getTeamHeaderSettings(
  teamId: string,
  userId: string,
): Promise<TeamHeaderSettings> {
  const row = await getHeaderRow(teamId);
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

export const saveTeamHeader = createTeamHeaderService({
  storage: createUserFileStorage(),
  resolveSource: resolveHeaderSource,
  fetchSource: fetchHeaderSource,
  persist: persistTeamHeader,
});
