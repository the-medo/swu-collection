import { db } from '../../db/index.ts';
import type { Database } from './types.ts';
import { CreatorError } from './errors.ts';
import { and, asc, eq, or, sql } from 'drizzle-orm';
import { creatorTag, creatorProfile, creatorMember } from '../../db/schema/creator_hub.ts';
import { user } from '../../db/schema/auth-schema.ts';
import type { CreatorProfileInput } from '../../../shared/creators/contracts.ts';
import { requireCreator } from './permissions.ts';
import { createCreatorDtos } from './dto.ts';
import { escapedSearch, groupDiscoveryTags, availableLanguages } from './filters.ts';
import { now } from './types.ts';
import { assertCreatorProfileAllowed } from './moderation.ts';

export function createProfilesService(database: Database = db) {
  const { profileDto, profileDtos } = createCreatorDtos(database);
  return {
    async taxonomy() {
      return database
        .select()
        .from(creatorTag)
        .orderBy(asc(creatorTag.dimension), asc(creatorTag.position));
    },
    async profiles(q = '', page = 1, language?: string, tags?: string) {
      const filters = [
        q ? sql`${creatorProfile.profile}->>'name' ILIKE ${escapedSearch(q)}` : undefined,
        ...groupDiscoveryTags(tags).map(ids =>
          or(
            ...ids.map(
              id => sql`${creatorProfile.profile}->'specialties' @> ${JSON.stringify([id])}::jsonb`,
            ),
          ),
        ),
      ];
      // Facets use the whole matching area, before pagination and language selection.
      const [rows, languageRows] = await Promise.all([
        database
          .select()
          .from(creatorProfile)
          .where(
            and(
              ...filters,
              language
                ? sql`EXISTS (SELECT 1 FROM jsonb_array_elements_text(${creatorProfile.profile}->'languages') AS creator_language(value) WHERE lower(value) = ${language.toLowerCase()} OR lower(value) LIKE ${language.toLowerCase() + '-%'})`
                : undefined,
            ),
          )
          .orderBy(asc(creatorProfile.slug))
          .limit(25)
          .offset((page - 1) * 24),
        database
          .selectDistinct({
            language: sql<string>`jsonb_array_elements_text(${creatorProfile.profile}->'languages')`,
          })
          .from(creatorProfile)
          .where(and(...filters)),
      ]);
      return {
        items: await profileDtos(rows.slice(0, 24)),
        hasMore: rows.length > 24,
        languages: availableLanguages(languageRows),
      };
    },
    async profile(slug: string) {
      const [row] = await database
        .select()
        .from(creatorProfile)
        .where(eq(creatorProfile.slug, slug));
      if (!row) throw new CreatorError('Creator not found.', 404);
      return profileDto(row);
    },
    async mine(viewerId: string) {
      const rows = await database
        .select()
        .from(creatorProfile)
        .where(
          or(
            eq(creatorProfile.ownerId, viewerId),
            sql`EXISTS (SELECT 1 FROM ${creatorMember} WHERE ${creatorMember.creatorId} = ${creatorProfile.id} AND ${creatorMember.userId} = ${viewerId})`,
          ),
        );
      return profileDtos(rows);
    },
    async saveProfile(
      viewerId: string,
      input: CreatorProfileInput,
      id?: string,
      revision?: number,
    ) {
      try {
        return await database.transaction(async tx => {
          if (id) {
            const existing = await requireCreator(tx, id, viewerId, true, true);
            if (existing.slug !== input.slug)
              throw new CreatorError(
                'A creator address stays fixed after creation. You can change the display name.',
              );
          }
          assertCreatorProfileAllowed(input);
          const [row] = id
            ? await tx
                .update(creatorProfile)
                .set({
                  slug: input.slug,
                  profile: input,
                  revision: sql`${creatorProfile.revision} + 1`,
                  updatedAt: now(),
                })
                .where(and(eq(creatorProfile.id, id), eq(creatorProfile.revision, revision!)))
                .returning()
            : await tx
                .insert(creatorProfile)
                .values({ ownerId: viewerId, slug: input.slug, profile: input })
                .returning();
          if (!row)
            throw new CreatorError('This profile changed. Reload before saving again.', 409);
          return { id: row.id, slug: row.slug };
        });
      } catch (error) {
        if (
          (error as { cause?: { code?: string } }).cause?.code === '23505' ||
          (error as { code?: string }).code === '23505'
        ) {
          const [existing] = await database
            .select({ ownerId: creatorProfile.ownerId })
            .from(creatorProfile)
            .where(eq(creatorProfile.slug, input.slug));
          if (existing?.ownerId === null)
            throw new CreatorError(
              'This creator already has a directory profile. Contact SWUBASE on Discord to request access.',
              409,
            );
          throw new CreatorError('That creator address is already in use.', 409);
        }
        throw error;
      }
    },
    async members(creatorId: string, viewerId: string) {
      await requireCreator(database, creatorId, viewerId, true);
      return database
        .select({ userId: user.id, name: user.displayName })
        .from(creatorMember)
        .innerJoin(user, eq(creatorMember.userId, user.id))
        .where(eq(creatorMember.creatorId, creatorId));
    },
    async setMember(creatorId: string, viewerId: string, userId: string, remove: boolean) {
      await database.transaction(async tx => {
        const owner = await requireCreator(tx, creatorId, viewerId, true, true);
        if (userId === owner.ownerId) throw new CreatorError('The owner already has access.');
        const [target] = await tx.select({ id: user.id }).from(user).where(eq(user.id, userId));
        if (!target) throw new CreatorError('User not found.', 404);
        if (remove)
          await tx
            .delete(creatorMember)
            .where(and(eq(creatorMember.creatorId, creatorId), eq(creatorMember.userId, userId)));
        else await tx.insert(creatorMember).values({ creatorId, userId }).onConflictDoNothing();
      });
    },
  };
}
