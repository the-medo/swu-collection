import { CONNECTION_TOURNAMENT_PAGE_SIZE } from '../../../shared/creators/contracts.ts';
import { user } from '../../db/schema/auth-schema.ts';
import { db } from '../../db/index.ts';
import type { Database } from './types.ts';
import { and, asc, desc, eq, inArray, sql, type SQL } from 'drizzle-orm';
import {
  creation,
  creationTag,
  creationReference,
  creatorProfile,
} from '../../db/schema/creator_hub.ts';
import { deck } from '../../db/schema/deck.ts';
import { tournament } from '../../db/schema/tournament.ts';
import { tournamentType } from '../../db/schema/tournament_type.ts';
import { getMergedCardList } from '../cards/cardListProvider.ts';
import { setInfo } from '../../../lib/swu-resources/set-info.ts';
import type {
  DiscoveryQuery,
  EntityReference,
  ConnectionSubject,
} from '../../../shared/creators/contracts.ts';
import { creationListSelection, publicCreation } from './list.ts';
import { resolveReference, resolveReferences, type ResolvedReference } from './references.ts';
import { CreatorError } from './errors.ts';
import { escapedSearch, groupDiscoveryTags, availableLanguages } from './filters.ts';

export function createDiscoveryService(database: Database = db) {
  return {
    async discover(query: DiscoveryQuery) {
      const filters: (SQL | undefined)[] = [publicCreation()];
      if (query.q)
        filters.push(
          sql`(${creation.published}->>'title' ILIKE ${escapedSearch(query.q)} OR ${creation.published}->>'summary' ILIKE ${escapedSearch(query.q)})`,
        );
      if (query.freshness)
        filters.push(sql`${creation.published}->>'freshness' = ${query.freshness}`);
      if (query.creatorId) filters.push(eq(creation.creatorId, query.creatorId));
      if (query.series) filters.push(sql`${creation.published}->>'series' = ${query.series}`);
      if (query.after) filters.push(sql`${creation.publishedAt} >= ${query.after}::date`);
      if (query.before)
        filters.push(sql`${creation.publishedAt} < ${query.before}::date + interval '1 day'`);
      for (const ids of groupDiscoveryTags(query.tags))
        filters.push(
          sql`EXISTS (SELECT 1 FROM ${creationTag} WHERE ${creationTag.creationId} = ${creation.id} AND ${inArray(creationTag.tagId, ids)})`,
        );
      let subject: ResolvedReference | null = null;
      if (query.entityType && query.entityId) {
        subject = await resolveReference(
          { type: query.entityType, id: query.entityId, startSeconds: null },
          database,
        );
        if (!subject) return { items: [], hasMore: false, languages: [] };
        const entityTypes = ['card', 'leader', 'base'].includes(query.entityType)
          ? ['card', 'leader', 'base']
          : [query.entityType];
        filters.push(
          sql`EXISTS (SELECT 1 FROM ${creationReference} WHERE ${creationReference.creationId} = ${creation.id} AND ${inArray(creationReference.entityType, entityTypes)} AND ${creationReference.entityId} = ${query.entityId})`,
        );
      }
      const languageRows = await database
        .selectDistinct({ language: sql<string>`${creation.published}->>'language'` })
        .from(creation)
        .where(and(...filters));
      if (query.language)
        filters.push(
          sql`(lower(${creation.published}->>'language') = ${query.language.toLowerCase()} OR lower(${creation.published}->>'language') LIKE ${query.language.toLowerCase() + '-%'})`,
        );
      const rows = await database
        .select(creationListSelection())
        .from(creation)
        .leftJoin(creatorProfile, eq(creation.creatorId, creatorProfile.id))
        .leftJoin(user, eq(creation.authorId, user.id))
        .where(and(...filters))
        .orderBy(
          ...(query.series
            ? [sql`(${creation.published}->>'seriesOrder')::int ASC`]
            : query.creatorId
              ? [sql`(${creation.published}->>'pinned')::boolean DESC`]
              : []),
          desc(creation.publishedAt),
          desc(creation.id),
        )
        .limit((query.limit ?? 24) + 1)
        .offset((query.page - 1) * (query.limit ?? 24));
      return {
        items: rows.slice(0, query.limit ?? 24),
        hasMore: rows.length > (query.limit ?? 24),
        languages: availableLanguages(languageRows),
        subject: subject ? { type: subject.type, id: subject.id, label: subject.label } : undefined,
      };
    },
    async collections(creatorId: string) {
      const [seriesRows, deckRows] = await Promise.all([
        database
          .selectDistinct({ name: sql<string>`${creation.published}->>'series'` })
          .from(creation)
          .where(
            and(
              eq(creation.creatorId, creatorId),
              publicCreation(),
              sql`${creation.published}->>'series' <> ''`,
            ),
          )
          .orderBy(sql`${creation.published}->>'series'`)
          .limit(201),
        database
          .selectDistinct({ id: creationReference.entityId })
          .from(creationReference)
          .innerJoin(creation, eq(creationReference.creationId, creation.id))
          .innerJoin(
            deck,
            and(
              eq(
                deck.id,
                sql`CASE WHEN ${creationReference.entityType} = 'deck' THEN ${creationReference.entityId}::uuid END`,
              ),
              eq(deck.public, 1),
            ),
          )
          .where(
            and(
              eq(creation.creatorId, creatorId),
              publicCreation(),
              eq(creationReference.entityType, 'deck'),
            ),
          )
          .orderBy(asc(creationReference.entityId))
          .limit(201),
      ]);
      const decks = await resolveReferences(
        deckRows
          .slice(0, 200)
          .map(row => ({ type: 'deck' as const, id: row.id, startSeconds: null })),
        database,
      );
      return {
        series: seriesRows.slice(0, 200).map(row => row.name),
        decks,
        hasMore: seriesRows.length > 200 || deckRows.length > 200,
      };
    },
    resolveSubjects: (refs: EntityReference[]) => resolveReferences(refs, database),
    async subjects(
      type: EntityReference['type'],
      q: string,
      scope: 'discovery' | 'authoring' = 'discovery',
      options: { userId?: string; page?: number } = {},
    ): Promise<ConnectionSubject[]> {
      const pageSize =
        type === 'tournament' && scope === 'authoring' ? CONNECTION_TOURNAMENT_PAGE_SIZE : 50;
      const offset = ((options.page ?? 1) - 1) * pageSize;
      if (type === 'deck' && scope === 'authoring' && !options.userId)
        throw new CreatorError('Sign in to choose your decks.', 401);
      if (type === 'deck')
        return (
          await database
            .select({
              id: deck.id,
              label: deck.name,
              leaderId: deck.leaderCardId1,
              leader2Id: deck.leaderCardId2,
              baseId: deck.baseCardId,
            })
            .from(deck)
            .where(
              and(
                eq(deck.public, 1),
                scope === 'authoring' ? eq(deck.userId, options.userId!) : undefined,
                sql`${deck.name} ILIKE ${escapedSearch(q)}`,
              ),
            )
            .orderBy(desc(deck.updatedAt), asc(deck.id))
            .limit(pageSize)
            .offset(offset)
        ).map(row => ({ ...row, type }));
      if (type === 'tournament')
        return (
          await database
            .select({
              id: tournament.id,
              label: tournament.name,
              date: sql<string>`${tournament.date}::text`,
              location: tournament.location,
            })
            .from(tournament)
            .innerJoin(tournamentType, eq(tournament.type, tournamentType.id))
            .where(
              and(
                sql`${tournament.name} ILIKE ${escapedSearch(q)}`,
                scope === 'discovery'
                  ? sql`(${tournament.date} BETWEEN (CURRENT_DATE - INTERVAL '1 month')::date AND CURRENT_DATE OR (${tournament.date} > CURRENT_DATE AND ${tournamentType.major} = 1))`
                  : undefined,
              ),
            )
            .orderBy(
              scope === 'authoring'
                ? desc(tournament.date)
                : sql`abs(${tournament.date} - CURRENT_DATE)`,
              asc(tournament.id),
            )
            .limit(pageSize)
            .offset(offset)
        ).map(row => ({ ...row, type }));
      if (type === 'set')
        return Object.values(setInfo)
          .filter(s => `${s.code} ${s.name}`.toLowerCase().includes(q.toLowerCase()))
          .sort((a, b) => b.releaseDate.localeCompare(a.releaseDate) || b.sortValue - a.sortValue)
          .map(s => ({ type, id: s.code, label: s.name, date: s.releaseDate }));
      return Object.values(await getMergedCardList())
        .filter(
          card =>
            card &&
            (type === 'card' || card.type === (type === 'leader' ? 'Leader' : 'Base')) &&
            `${card.name} ${card.subtitle ?? ''}`.toLowerCase().includes(q.toLowerCase()),
        )
        .slice(0, 30)
        .map(card => ({
          type,
          id: card!.cardId,
          label: `${card!.name}${card!.subtitle ? ` — ${card!.subtitle}` : ''}`,
        }));
    },
  };
}
