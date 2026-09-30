import { and, asc, eq, sql } from 'drizzle-orm';
import { db } from '../../db';
import { user } from '../../db/schema/auth-schema.ts';
import { tournament } from '../../db/schema/tournament.ts';
import {
  userTournamentAttachment as attachments,
  userTournamentPreparation as preparation,
} from '../../db/schema/user_tournament_attachment.ts';
import {
  defaultPreparation,
  maxAttachmentBytes,
  privateLink,
  type AttachmentCategory,
  type AttachmentCreateInput,
  type AttachmentUpdateInput,
  type PreparationStatus,
  type TournamentAttachment,
  type TournamentAttachments,
} from '../../../types/TournamentAttachment.ts';
import {
  AttachmentError,
  attachmentFileType,
  attachmentStorage,
  type AttachmentStorage,
} from './storage.ts';

const owned = (userId: string, tournamentId: string, id?: string) =>
  and(
    eq(attachments.userId, userId),
    eq(attachments.tournamentId, tournamentId),
    id ? eq(attachments.id, id) : undefined,
  );
function dto(row: typeof attachments.$inferSelect): TournamentAttachment {
  const { userId, objectKey, ...data } = row;
  return {
    ...data,
    downloadUrl: objectKey
      ? `/api/user-tournament-attachments/${row.tournamentId}/${row.id}/file`
      : null,
  };
}
export function createAttachmentService(storage: AttachmentStorage = attachmentStorage) {
  const exists = async (tournamentId: string) => {
    const [row] = await db
      .select({ id: tournament.id })
      .from(tournament)
      .where(eq(tournament.id, tournamentId));
    if (!row) throw new AttachmentError('Tournament not found.', 404);
  };
  const create = async (
    userId: string,
    tournamentId: string,
    input: AttachmentCreateInput | { category: AttachmentCategory; title: string; file: File },
  ) => {
    const id = crypto.randomUUID();
    const file = 'file' in input ? input.file : null;
    if (file && (!file.size || file.size > maxAttachmentBytes))
      throw new AttachmentError('Files must be between 1 byte and 10 MB.', 413);
    const bytes = file ? new Uint8Array(await file.arrayBuffer()) : null;
    const extension = bytes && file ? attachmentFileType(bytes, file.type) : null;
    const key = extension
      ? `user-data/${encodeURIComponent(userId)}/tournament/${tournamentId}/${id}.${extension}`
      : null;
    let uploaded = false;
    try {
      return await db.transaction(async tx => {
        // Serialize the account's uploads so simultaneous requests cannot bypass quotas.
        const [owner] = await tx
          .select({ id: user.id })
          .from(user)
          .where(eq(user.id, userId))
          .for('update');
        if (!owner) throw new AttachmentError('Account not found.', 404);
        const [event] = await tx
          .select({ id: tournament.id })
          .from(tournament)
          .where(eq(tournament.id, tournamentId))
          .for('key share');
        if (!event) throw new AttachmentError('Tournament not found.', 404);
        const [usage] = await tx
          .select({
            count: sql<number>`count(*)::int`,
            eventCount: sql<number>`count(*) FILTER (WHERE ${attachments.tournamentId} = ${tournamentId})::int`,
            bytes: sql<number>`coalesce(sum(${attachments.byteSize}), 0)::float8`,
          })
          .from(attachments)
          .where(eq(attachments.userId, userId));
        if (
          usage.count >= 1000 ||
          usage.eventCount >= 100 ||
          usage.bytes + (file?.size ?? 0) > 500 * 1024 * 1024
        )
          throw new AttachmentError(
            'Attachment limit reached (100 per tournament, 1,000 total, 500 MB total).',
            409,
          );
        if (key && bytes) {
          await storage.put(key, bytes);
          uploaded = true;
        }
        const [row] = await tx
          .insert(attachments)
          .values({
            id,
            userId,
            tournamentId,
            category: input.category,
            title: input.title,
            ...('file' in input
              ? {
                  kind: 'file' as const,
                  objectKey: key,
                  fileName:
                    input.file.name
                      .split(/[\\/]/)
                      .pop()!
                      .replace(/[\u0000-\u001f\u007f]/g, '')
                      .slice(0, 255) || `attachment.${extension}`,
                  mimeType: input.file.type,
                  byteSize: input.file.size,
                }
              : { kind: input.kind, content: input.content }),
          })
          .returning();
        return dto(row);
      });
    } catch (error) {
      // No readable object is left behind if the database write fails.
      if (uploaded && key) await storage.remove(key).catch(() => {});
      throw error;
    }
  };
  return {
    async list(userId: string, tournamentId: string): Promise<TournamentAttachments> {
      await exists(tournamentId);
      const [rows, statuses] = await Promise.all([
        db
          .select()
          .from(attachments)
          .where(owned(userId, tournamentId))
          .orderBy(asc(attachments.createdAt), asc(attachments.id)),
        db
          .select()
          .from(preparation)
          .where(and(eq(preparation.userId, userId), eq(preparation.tournamentId, tournamentId))),
      ]);
      const categories = defaultPreparation();
      for (const row of statuses) categories[row.category] = row.status;
      return { attachments: rows.map(dto), categories, uploadsEnabled: storage.available() };
    },
    create,
    async setCategory(
      userId: string,
      tournamentId: string,
      category: AttachmentCategory,
      status: PreparationStatus,
    ) {
      return db.transaction(async tx => {
        const [event] = await tx
          .select({ id: tournament.id })
          .from(tournament)
          .where(eq(tournament.id, tournamentId))
          .for('key share');
        if (!event) throw new AttachmentError('Tournament not found.', 404);
        await tx
          .insert(preparation)
          .values({ userId, tournamentId, category, status })
          .onConflictDoUpdate({
            target: [preparation.userId, preparation.tournamentId, preparation.category],
            set: { status, updatedAt: sql`now()` },
          });
        return { category, status };
      });
    },
    async update(userId: string, tournamentId: string, id: string, input: AttachmentUpdateInput) {
      return db.transaction(async tx => {
        const [row] = await tx
          .select()
          .from(attachments)
          .where(owned(userId, tournamentId, id))
          .for('update');
        if (!row) throw new AttachmentError('Attachment not found.', 404);
        if (row.kind === 'file' && input.content !== undefined)
          throw new AttachmentError('Files cannot have text content.', 400);
        if (
          row.kind === 'link' &&
          input.content !== undefined &&
          !privateLink.safeParse(input.content).success
        )
          throw new AttachmentError('Use an HTTP or HTTPS link without credentials.', 400);
        const [updated] = await tx
          .update(attachments)
          .set({ ...input, updatedAt: sql`now()` })
          .where(owned(userId, tournamentId, id))
          .returning();
        return dto(updated);
      });
    },
    async download(userId: string, tournamentId: string, id: string) {
      const [row] = await db
        .select()
        .from(attachments)
        .where(owned(userId, tournamentId, id));
      if (!row || row.kind !== 'file' || !row.objectKey)
        throw new AttachmentError('Attachment not found.', 404);
      const body = await storage.get(row.objectKey);
      if (body.byteLength !== row.byteSize)
        throw new AttachmentError('Could not read this attachment.', 502);
      return { attachment: dto(row), body };
    },
    async remove(userId: string, tournamentId: string, id: string) {
      await db.transaction(async tx => {
        const [row] = await tx
          .select()
          .from(attachments)
          .where(owned(userId, tournamentId, id))
          .for('update');
        if (!row) throw new AttachmentError('Attachment not found.', 404);
        // Preserve metadata on storage failure, so the owner can retry deletion.
        if (row.objectKey) await storage.remove(row.objectKey);
        await tx.delete(attachments).where(owned(userId, tournamentId, id));
      });
      return { id };
    },
  };
}
export const tournamentAttachmentService = createAttachmentService();
