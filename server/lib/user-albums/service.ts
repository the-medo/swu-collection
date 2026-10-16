import { and, asc, desc, eq, exists, gt, ilike, inArray, lt, or, sql, type SQL } from 'drizzle-orm';
import type { z } from 'zod';
import { db } from '../../db';
import { tournament } from '../../db/schema/tournament.ts';
import { user } from '../../db/schema/auth-schema.ts';
import { userFile as files, userFileStorage as quotas } from '../../db/schema/user_file.ts';
import { userAlbum as albums, userAlbumItem as items } from '../../db/schema/user_album.ts';
import {
  userAlbumPageSize,
  type UserAlbum,
  type BlockedEventAlbumList,
  type moderateAlbumEventLinkInput,
  type UserAlbumPage,
  type UserAlbumList,
  type UserAlbumCursor,
  type TournamentAlbumList,
  type AlbumTournamentOptions,
  type createUserAlbumInput,
  type updateUserAlbumInput,
  type addAlbumImagesInput,
  type updateAlbumImageInput,
} from '../../../types/UserAlbum.ts';
import { UserFileError } from '../user-files/errors.ts';
import { createUserFileStorage, type UserFileObjectStorage } from '../user-files/storage.ts';

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
const owned = (userId: string, id: string) => and(eq(albums.userId, userId), eq(albums.id, id));
const member = (albumId: string, fileId: string) =>
  and(eq(items.albumId, albumId), eq(items.fileId, fileId));
const missing = () => new UserFileError('Album not found.', 404);
const conflict = () => new UserFileError('This album has changed. Reload it and try again.', 409);

const tournamentFields = {
  id: tournament.id,
  name: tournament.name,
  date: sql<string>`${tournament.date}::text`.as('event_date'),
  location: tournament.location,
};
const afterCursor = (cursor?: UserAlbumCursor) =>
  cursor
    ? or(
        lt(albums.createdAt, cursor.beforeCreatedAt),
        and(eq(albums.createdAt, cursor.beforeCreatedAt), lt(albums.id, cursor.beforeId)),
      )
    : undefined;
function albumPage<T extends { id: string; createdAt: string }>(rows: T[]) {
  const page = rows.slice(0, userAlbumPageSize);
  const last = page.at(-1);
  return {
    albums: page,
    hasMore: rows.length > userAlbumPageSize,
    nextCursor:
      rows.length > userAlbumPageSize && last
        ? {
            beforeCreatedAt: last.createdAt.replace(' ', 'T').replace(/([+-]\d{2})$/, '$1:00'),
            beforeId: last.id,
          }
        : null,
  };
}

// All album writes share the upload/delete entitlement lock. Always acquire it
// before album or file rows, including when an account has not uploaded yet.
async function lockAccount(tx: Transaction, userId: string) {
  await tx.insert(quotas).values({ userId }).onConflictDoNothing();
  await tx.select().from(quotas).where(eq(quotas.userId, userId)).for('update');
}
async function validateTournamentLink(
  tx: Transaction,
  id: string,
  visibility: UserAlbum['visibility'],
) {
  if (visibility !== 'public')
    throw new UserFileError('Make the album public before linking it to a tournament.', 400);
  const [event] = await tx
    .select({ id: tournament.id })
    .from(tournament)
    .where(eq(tournament.id, id))
    .for('key share');
  if (!event) throw new UserFileError('Tournament not found.', 404);
}
async function bump(tx: Transaction, id: string) {
  const [result] = await tx
    .update(albums)
    .set({
      revision: sql`${albums.revision} + 1`,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(albums.id, id))
    .returning({ id: albums.id, revision: albums.revision });
  return result;
}
async function mutate<T>(
  userId: string,
  id: string,
  revision: number,
  action: (tx: Transaction, album: typeof albums.$inferSelect) => Promise<T>,
) {
  return db.transaction(async tx => {
    await lockAccount(tx, userId);
    const [album] = await tx.select().from(albums).where(owned(userId, id)).for('update');
    if (!album) throw missing();
    if (album.revision !== revision) throw conflict();
    return action(tx, album);
  });
}

export function createUserAlbumService(
  storage: Pick<UserFileObjectStorage, 'publicUrl'> = createUserFileStorage(),
) {
  async function summaries(
    tx: Transaction,
    condition: SQL | undefined,
    viewerId?: string,
  ): Promise<UserAlbum[]> {
    // Correlated indexed lookups keep counts and fallback covers in one query.
    const rows = await tx
      .select({
        album: albums,
        tournament: tournamentFields,
        imageCount: sql<number>`(select count(*)::int from ${items} where ${items.albumId} = ${albums.id})`,
        coverId: files.id,
        coverKey: files.thumbnailKey,
        coverAlt: sql<string>`coalesce((select ${items.altText} from ${items} where ${items.albumId} = ${albums.id} and ${items.fileId} = ${files.id}), '')`,
      })
      .from(albums)
      .leftJoin(tournament, eq(albums.tournamentId, tournament.id))
      .leftJoin(
        files,
        eq(
          files.id,
          sql`coalesce(${albums.coverFileId},
      (select ${items.fileId} from ${items} where ${items.albumId} = ${albums.id}
       order by ${items.position}, ${items.fileId} limit 1))`,
        ),
      )
      .where(condition)
      .orderBy(desc(albums.createdAt), desc(albums.id))
      .limit(userAlbumPageSize + 1);
    return rows.map(
      ({
        album: { eventLinkBlocked, ...album },
        tournament: event,
        imageCount,
        coverId,
        coverKey,
        coverAlt,
      }) => ({
        ...album,
        ...(viewerId === album.userId ? { eventLinkBlocked } : {}),
        tournament: event?.id ? event : null,
        imageCount,
        cover:
          coverId && coverKey
            ? { fileId: coverId, thumbnailUrl: storage.publicUrl(coverKey), altText: coverAlt }
            : null,
      }),
    );
  }
  return {
    async blockedEventAlbums(cursor?: UserAlbumCursor): Promise<BlockedEventAlbumList> {
      const rows = await db
        .select({
          id: albums.id,
          title: albums.title,
          revision: albums.revision,
          createdAt: albums.createdAt,
          owner: { id: user.id, displayName: user.displayName },
        })
        .from(albums)
        .innerJoin(user, eq(albums.userId, user.id))
        .where(and(eq(albums.eventLinkBlocked, true), afterCursor(cursor)))
        .orderBy(desc(albums.createdAt), desc(albums.id))
        .limit(userAlbumPageSize + 1);
      return albumPage(rows);
    },
    async moderateEventLink(id: string, input: z.infer<typeof moderateAlbumEventLinkInput>) {
      // Resolve the owner before taking the same account -> album locks as owner writes.
      const [owner] = await db
        .select({ userId: albums.userId })
        .from(albums)
        .where(eq(albums.id, id));
      if (!owner) throw missing();
      return mutate(owner.userId, id, input.revision, async (tx, album) => {
        if (album.eventLinkBlocked === input.blocked) return { id, revision: album.revision };
        if (input.blocked && !album.eventLinkBlocked && !album.tournamentId)
          throw new UserFileError(
            'This album is no longer linked to an event. Reload and try again.',
            409,
          );
        await tx
          .update(albums)
          .set({
            eventLinkBlocked: input.blocked,
            tournamentId: null,
          })
          .where(eq(albums.id, id));
        // Restoring permission never republishes an album; its owner chooses whether to link again.
        return bump(tx, id);
      });
    },
    async list(
      userId: string,
      cursor?: UserAlbumCursor,
      publicOnly = false,
    ): Promise<UserAlbumList> {
      return db.transaction(
        async tx => {
          const rows = await summaries(
            tx,
            and(
              eq(albums.userId, userId),
              publicOnly ? eq(albums.visibility, 'public') : undefined,
              afterCursor(cursor),
            ),
            publicOnly ? undefined : userId,
          );
          return albumPage(rows);
        },
        { isolationLevel: 'repeatable read', accessMode: 'read only' },
      );
    },
    async tournamentOptions(q: string, page: number): Promise<AlbumTournamentOptions> {
      const escaped = q.replace(/[\\%_]/g, '\\$&');
      const pattern = `%${escaped}%`;
      const id = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(q)
        ? q
        : undefined;
      const rows = await db
        .select(tournamentFields)
        .from(tournament)
        .where(
          q
            ? or(
                ilike(tournament.name, pattern),
                ilike(tournament.location, escaped),
                id ? eq(tournament.id, id) : undefined,
              )
            : undefined,
        )
        .orderBy(desc(tournament.date), desc(tournament.id))
        .limit(21)
        .offset(page * 20);
      return { tournaments: rows.slice(0, 20), hasMore: rows.length > 20 };
    },
    async byTournament(
      tournamentId: string,
      cursor?: UserAlbumCursor,
    ): Promise<TournamentAlbumList> {
      return db.transaction(
        async tx => {
          const [event] = await tx
            .select({ id: tournament.id })
            .from(tournament)
            .where(eq(tournament.id, tournamentId));
          if (!event) throw new UserFileError('Tournament not found.', 404);
          const page = albumPage(
            await summaries(
              tx,
              and(
                eq(albums.tournamentId, tournamentId),
                eq(albums.visibility, 'public'),
                afterCursor(cursor),
                exists(
                  tx.select({ id: items.fileId }).from(items).where(eq(items.albumId, albums.id)),
                ),
              ),
            ),
          );
          if (!page.albums.length) return { ...page, albums: [] };
          const owners = await tx
            .select({ albumId: albums.id, owner: { id: user.id, displayName: user.displayName } })
            .from(albums)
            .innerJoin(user, eq(albums.userId, user.id))
            .where(
              inArray(
                albums.id,
                page.albums.map(album => album.id),
              ),
            );
          return {
            ...page,
            albums: page.albums.map(album => ({
              ...album,
              // The album's owner FK and repeatable-read snapshot guarantee this row exists.
              owner: owners.find(row => row.albumId === album.id)!.owner,
            })),
          };
        },
        { isolationLevel: 'repeatable read', accessMode: 'read only' },
      );
    },
    async read(
      id: string,
      viewerId: string | undefined,
      page: number,
      revision?: number,
    ): Promise<UserAlbumPage> {
      return db.transaction(
        async tx => {
          const [album] = await summaries(tx, eq(albums.id, id), viewerId);
          if (!album || (album.visibility === 'private' && album.userId !== viewerId))
            throw missing();
          if (revision !== undefined && revision !== album.revision) throw conflict();
          const [owner] = await tx
            .select({ id: user.id, displayName: user.displayName })
            .from(user)
            .where(eq(user.id, album.userId));
          const rows = await tx
            .select({
              fileId: files.id,
              imageKey: files.imageKey,
              thumbnailKey: files.thumbnailKey,
              width: files.width,
              height: files.height,
              caption: items.caption,
              altText: items.altText,
              position: items.position,
            })
            .from(items)
            .innerJoin(files, eq(items.fileId, files.id))
            .where(eq(items.albumId, id))
            .orderBy(asc(items.position), asc(items.fileId))
            .limit(userAlbumPageSize + 1)
            .offset(page * userAlbumPageSize);
          return {
            album,
            owner,
            hasMore: rows.length > userAlbumPageSize,
            images: rows
              .slice(0, userAlbumPageSize)
              .map(({ imageKey, thumbnailKey, ...image }) => ({
                ...image,
                url: storage.publicUrl(imageKey),
                thumbnailUrl: storage.publicUrl(thumbnailKey),
              })),
          };
        },
        { isolationLevel: 'repeatable read', accessMode: 'read only' },
      );
    },
    async create(userId: string, input: z.infer<typeof createUserAlbumInput>) {
      return db.transaction(async tx => {
        await lockAccount(tx, userId);
        if (input.tournamentId)
          await validateTournamentLink(tx, input.tournamentId, input.visibility);
        const [result] = await tx
          .insert(albums)
          .values({ ...input, userId })
          .returning({ id: albums.id, revision: albums.revision });
        return result;
      });
    },
    async update(userId: string, id: string, input: z.infer<typeof updateUserAlbumInput>) {
      return mutate(userId, id, input.revision, async (tx, album) => {
        const { revision, ...values } = input;
        const visibility = values.visibility ?? album.visibility;
        if (values.tournamentId) {
          if (album.eventLinkBlocked)
            throw new UserFileError('An admin has disabled event linking for this album.', 403);
          await validateTournamentLink(tx, values.tournamentId, visibility);
        }
        // Lowering privacy withdraws the album from the event and prevents later automatic relinking.
        if (visibility !== 'public') values.tournamentId = null;
        if (values.coverFileId) {
          const [cover] = await tx
            .select({ id: files.id })
            .from(items)
            .innerJoin(files, eq(items.fileId, files.id))
            .where(and(member(id, values.coverFileId), eq(files.userId, userId)));
          if (!cover) throw new UserFileError('Choose a cover from this album.', 400);
        }
        if (Object.keys(values).length)
          await tx.update(albums).set(values).where(owned(userId, id));
        return bump(tx, id);
      });
    },
    async remove(userId: string, id: string, revision: number) {
      return mutate(userId, id, revision, async tx => {
        await tx.delete(albums).where(owned(userId, id));
        return { id, revision };
      });
    },
    async addImages(userId: string, id: string, input: z.infer<typeof addAlbumImagesInput>) {
      return mutate(userId, id, input.revision, async (tx, album) => {
        const ids = [...new Set(input.fileIds)];
        const ownedFiles = await tx
          .select({ id: files.id })
          .from(files)
          .where(and(eq(files.userId, userId), inArray(files.id, ids)));
        if (ownedFiles.length !== ids.length)
          throw new UserFileError('Choose images from your own uploads.', 400);
        const [last] = await tx
          .select({ position: items.position })
          .from(items)
          .where(eq(items.albumId, id))
          .orderBy(desc(items.position))
          .limit(1);
        const added = await tx
          .insert(items)
          .values(
            ids.map((fileId, index) => ({
              albumId: id,
              fileId,
              position: (last?.position ?? -1) + index + 1,
            })),
          )
          .onConflictDoNothing()
          .returning({ fileId: items.fileId });
        return added.length ? bump(tx, id) : { id, revision: album.revision };
      });
    },
    async updateImage(
      userId: string,
      id: string,
      fileId: string,
      input: z.infer<typeof updateAlbumImageInput>,
    ) {
      return mutate(userId, id, input.revision, async tx => {
        const [image] = await tx.select().from(items).where(member(id, fileId));
        if (!image) throw new UserFileError('Image not found in this album.', 404);
        const { revision, move, ...values } = input;
        if (Object.keys(values).length)
          await tx.update(items).set(values).where(member(id, fileId));
        if (move) {
          const condition =
            move.type === 'before'
              ? eq(items.fileId, move.fileId)
              : move.type === 'earlier'
                ? lt(items.position, image.position)
                : gt(items.position, image.position);
          const [target] = await tx
            .select()
            .from(items)
            .where(and(eq(items.albumId, id), condition))
            .orderBy(move.type === 'earlier' ? desc(items.position) : asc(items.position))
            .limit(1);
          if (!target && move.type === 'before')
            throw new UserFileError('The destination image is no longer in this album.', 409);
          if (target && target.fileId !== fileId) {
            const position =
              move.type === 'before' && target.position > image.position
                ? target.position - 1
                : target.position;
            if (position < image.position) {
              await tx
                .update(items)
                .set({ position: sql`${items.position} + 1` })
                .where(
                  and(
                    eq(items.albumId, id),
                    sql`${items.position} >= ${position} AND ${items.position} < ${image.position}`,
                  ),
                );
            } else if (position > image.position) {
              await tx
                .update(items)
                .set({ position: sql`${items.position} - 1` })
                .where(
                  and(
                    eq(items.albumId, id),
                    sql`${items.position} > ${image.position} AND ${items.position} <= ${position}`,
                  ),
                );
            }
            await tx.update(items).set({ position }).where(member(id, fileId));
          }
        }
        return bump(tx, id);
      });
    },
    async removeImage(userId: string, id: string, fileId: string, revision: number) {
      return mutate(userId, id, revision, async tx => {
        const removed = await tx.delete(items).where(member(id, fileId)).returning();
        if (!removed.length) throw new UserFileError('Image not found in this album.', 404);
        await tx
          .update(albums)
          .set({ coverFileId: null })
          .where(and(owned(userId, id), eq(albums.coverFileId, fileId)));
        return bump(tx, id);
      });
    },
    async membership(userId: string, fileIds: string[], albumId?: string) {
      // Private picker/deletion data, never included in album responses.
      const rows = await db
        .select({ fileId: items.fileId, albumId: items.albumId })
        .from(items)
        .innerJoin(albums, eq(albums.id, items.albumId))
        .where(
          and(
            eq(albums.userId, userId),
            inArray(items.fileId, fileIds),
            albumId ? eq(albums.id, albumId) : undefined,
          ),
        );
      return rows;
    },
  };
}
export const userAlbumService = createUserAlbumService();
