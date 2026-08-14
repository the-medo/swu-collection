import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { and, count, eq, gt, inArray, or, sql } from 'drizzle-orm';
import { deck as deckTable } from '../../db/schema/deck.ts';
import { db } from '../../db';
import { user as userTable } from '../../db/schema/auth-schema.ts';
import { deckInformation as deckInformationTable } from '../../db/schema/deck_information.ts';
import { userDeckFavorite as usedDeckFavoriteTable } from '../../db/schema/user_deck_favorite.ts';
import { withPagination } from '../../lib/withPagination.ts';
import { zPaginationParams } from '../../../types/ZPaginationParams.ts';
import { z } from 'zod';
import { SwuAspect } from '../../../types/enums.ts';
import { DeckSortField } from '../../../types/ZDeck.ts';
import { selectUser } from '../user.ts';
import { selectDeck, selectDeckInformation } from '../deck.ts';
import type { AuthExtension } from '../../auth/auth.ts';
import { booleanPreprocessor } from '../../../shared/lib/zod/booleanPreprocessor.ts';
import { entityPrice } from '../../db/schema/entity_price.ts';
import { deckBranch } from '../../db/schema/deck_branch.ts';
import { deckChangeRequest } from '../../db/schema/deck_change_request.ts';
import { team as teamTable } from '../../db/schema/team.ts';

export const zDeckQueryParams = zPaginationParams.extend({
  userId: z.string().optional(),
  favorite: booleanPreprocessor.optional().default(false),
  format: z.coerce.number().int().positive().optional(),
  leaders: z
    .string()
    .optional()
    .transform(val => (val ? val.split(',') : undefined)),
  base: z.string().optional(),
  baseAspect: z.enum(SwuAspect).optional(),
  aspects: z
    .string()
    .optional()
    .transform(val => (val ? val.split(',').map(a => a.trim()) : undefined)),
  branchView: z.enum(['all', 'branches', 'branched']).optional().default('all'),
  branchTeamId: z.guid().optional(),
  sort: z
    .enum([
      DeckSortField.CREATED_AT,
      DeckSortField.UPDATED_AT,
      DeckSortField.NAME,
      DeckSortField.FORMAT,
      DeckSortField.FAVORITES,
      DeckSortField.SCORE,
    ])
    .default(DeckSortField.UPDATED_AT),
});
export type DeckQueryParams = z.infer<typeof zDeckQueryParams>;

export const deckGetRoute = new Hono<AuthExtension>().get(
  '/',
  zValidator('query', zDeckQueryParams),
  async c => {
    const user = c.get('user');
    const {
      userId,
      favorite,
      format,
      leaders: leaderIds,
      base,
      baseAspect,
      aspects: aspectList,
      branchView,
      branchTeamId,
      limit,
      offset,
      sort,
      order,
    } = c.req.valid('query');

    const filters = [];

    // Public decks filter - only show public decks unless viewing your own
    if (!userId || userId !== user?.id) filters.push(eq(deckTable.public, 1));

    if (userId) {
      filters.push(eq(deckTable.userId, userId));
    }

    if (userId && userId === user?.id) {
      const branchTeamCondition = branchTeamId
        ? sql`and ${deckBranch.teamId} = ${branchTeamId}`
        : sql``;
      const isBranchDeck = sql`exists (
        select 1 from ${deckBranch}
        where ${deckBranch.branchDeckId} = ${deckTable.id}
        ${branchTeamCondition}
      )`;
      const hasOpenBranches = sql`exists (
        select 1 from ${deckBranch}
        where ${deckBranch.baseDeckId} = ${deckTable.id}
        and ${deckBranch.status} = 'open'
        ${branchTeamCondition}
      )`;

      if (branchView === 'branches') {
        filters.push(isBranchDeck);
      } else if (branchView === 'branched') {
        filters.push(hasOpenBranches);
      } else if (branchTeamId) {
        filters.push(sql`(${isBranchDeck} or ${hasOpenBranches})`);
      }
    }

    // Format filter
    if (format && !isNaN(Number(format))) {
      filters.push(eq(deckTable.format, Number(format)));
    }

    // Leaders filter (comma-separated list of leader IDs)
    if (leaderIds) {
      if (leaderIds.length === 1) {
        filters.push(
          or(eq(deckTable.leaderCardId1, leaderIds[0]), eq(deckTable.leaderCardId2, leaderIds[0])),
        );
      } else if (leaderIds.length > 1) {
        // Handle case where multiple leaders are specified
        const leaderFilters = [];
        for (const leaderId of leaderIds) {
          leaderFilters.push(
            or(eq(deckTable.leaderCardId1, leaderId), eq(deckTable.leaderCardId2, leaderId)),
          );
        }
        filters.push(or(...leaderFilters));
      }
    }

    // Base card filter
    if (base) {
      filters.push(eq(deckTable.baseCardId, base));
    }

    // Create a query builder that we can conditionally modify
    let query = db
      .select({
        user: selectUser,
        deck: selectDeck,
        deck_information: selectDeckInformation,
      })
      .from(deckTable)
      .innerJoin(userTable, eq(deckTable.userId, userTable.id))
      .$dynamic();

    // Add join to deck_information
    query = query.innerJoin(deckInformationTable, eq(deckTable.id, deckInformationTable.deckId));

    if (favorite && user?.id) {
      query = query.innerJoin(
        usedDeckFavoriteTable,
        and(
          eq(deckTable.id, usedDeckFavoriteTable.deckId),
          eq(usedDeckFavoriteTable.userId, user.id),
        ),
      );
    }

    if (baseAspect || aspectList) {
      // Base aspect filter
      if (baseAspect) {
        filters.push(eq(deckInformationTable.baseAspect, baseAspect));
      }

      // Aspect combinations filter (comma-separated list of aspects)
      if (aspectList) {
        const aspectFilters = [];

        for (const aspect of aspectList) {
          switch (aspect.toLowerCase()) {
            case 'command':
              aspectFilters.push(gt(deckInformationTable.aspectCommand, 0));
              break;
            case 'vigilance':
              aspectFilters.push(gt(deckInformationTable.aspectVigilance, 0));
              break;
            case 'aggression':
              aspectFilters.push(gt(deckInformationTable.aspectAggression, 0));
              break;
            case 'cunning':
              aspectFilters.push(gt(deckInformationTable.aspectCunning, 0));
              break;
            case 'heroism':
              aspectFilters.push(gt(deckInformationTable.aspectHeroism, 0));
              break;
            case 'villainy':
              aspectFilters.push(gt(deckInformationTable.aspectVillainy, 0));
              break;
          }
        }

        if (aspectFilters.length > 0) {
          // Match decks with ALL specified aspects (AND)
          filters.push(and(...aspectFilters));
        }
      }
    }

    // Apply all filters
    if (filters.length > 0) {
      query = query.where(and(...filters));
    }
    query = withPagination(query, limit, offset);

    // Apply sorting, limit, and offset
    const decks = await query.orderBy(sql.raw(`${sort} ${order}`));

    // Optimize: fetch all entity prices for the returned deck IDs in a single query
    const deckIds = decks.map(d => d.deck.id);
    let pricesByDeck = new Map<string, any[]>();
    let branchContextByDeck = new Map<string, any>();
    let openBranchTeamsByDeck = new Map<
      string,
      Array<{ teamId: string; teamName: string; teamShortcut: string | null; count: number }>
    >();
    let openChangeRequestsByDeck = new Map<string, number>();

    if (deckIds.length > 0) {
      const priceRows = await db
        .select()
        .from(entityPrice)
        .where(and(inArray(entityPrice.entityId, deckIds)));

      pricesByDeck = priceRows.reduce((acc, row) => {
        const list = acc.get(row.entityId) ?? [];
        list.push(row);
        acc.set(row.entityId, list);
        return acc;
      }, new Map<string, any[]>());

      if (userId && userId === user?.id) {
        const branchRows = await db
          .select()
          .from(deckBranch)
          .where(inArray(deckBranch.branchDeckId, deckIds));
        const baseDeckIds = [...new Set(branchRows.map(branch => branch.baseDeckId))];
        const branchTeamIds = [...new Set(branchRows.map(branch => branch.teamId))];
        const branchIds = branchRows.map(branch => branch.id);

        const [baseDecks, branchTeams, changeRequests] = await Promise.all([
          baseDeckIds.length > 0
            ? db.select().from(deckTable).where(inArray(deckTable.id, baseDeckIds))
            : Promise.resolve([]),
          branchTeamIds.length > 0
            ? db.select().from(teamTable).where(inArray(teamTable.id, branchTeamIds))
            : Promise.resolve([]),
          branchIds.length > 0
            ? db
                .select()
                .from(deckChangeRequest)
                .where(
                  and(
                    inArray(deckChangeRequest.branchId, branchIds),
                    eq(deckChangeRequest.status, 'open'),
                  ),
                )
            : Promise.resolve([]),
        ]);

        const baseDeckMap = new Map(baseDecks.map(deck => [deck.id, deck]));
        const teamMap = new Map(branchTeams.map(team => [team.id, team]));
        const changeRequestMap = new Map(changeRequests.map(request => [request.branchId, request]));

        branchContextByDeck = branchRows.reduce((acc, branch) => {
          const baseDeck = baseDeckMap.get(branch.baseDeckId);
          const branchTeam = teamMap.get(branch.teamId);
          if (!baseDeck || !branchTeam) return acc;

          acc.set(branch.branchDeckId, {
            branch,
            baseDeck,
            team: {
              id: branchTeam.id,
              name: branchTeam.name,
              shortcut: branchTeam.shortcut,
            },
            changeRequest: changeRequestMap.get(branch.id) ?? null,
          });
          return acc;
        }, new Map<string, any>());

        const openBranchRows = await db
          .select({
            baseDeckId: deckBranch.baseDeckId,
            teamId: teamTable.id,
            teamName: teamTable.name,
            teamShortcut: teamTable.shortcut,
            count: count(deckBranch.id),
          })
          .from(deckBranch)
          .innerJoin(teamTable, eq(deckBranch.teamId, teamTable.id))
          .where(and(inArray(deckBranch.baseDeckId, deckIds), eq(deckBranch.status, 'open')))
          .groupBy(deckBranch.baseDeckId, teamTable.id, teamTable.name, teamTable.shortcut);

        openBranchTeamsByDeck = openBranchRows.reduce((acc, row) => {
          const list = acc.get(row.baseDeckId) ?? [];
          list.push({
            teamId: row.teamId,
            teamName: row.teamName,
            teamShortcut: row.teamShortcut,
            count: Number(row.count),
          });
          acc.set(row.baseDeckId, list);
          return acc;
        }, new Map<string, Array<{ teamId: string; teamName: string; teamShortcut: string | null; count: number }>>());

        const openChangeRequestRows = await db
          .select({
            baseDeckId: deckChangeRequest.baseDeckId,
            count: count(deckChangeRequest.id),
          })
          .from(deckChangeRequest)
          .where(
            and(
              inArray(deckChangeRequest.baseDeckId, deckIds),
              eq(deckChangeRequest.status, 'open'),
            ),
          )
          .groupBy(deckChangeRequest.baseDeckId);

        openChangeRequestsByDeck = openChangeRequestRows.reduce((acc, row) => {
          acc.set(row.baseDeckId, Number(row.count));
          return acc;
        }, new Map<string, number>());
      }
    }

    const dataWithPrices = decks.map(d => ({
      ...d,
      entityPrices: pricesByDeck.get(d.deck.id) ?? [],
      branchContext: branchContextByDeck.get(d.deck.id) ?? null,
      openBranchTeams: openBranchTeamsByDeck.get(d.deck.id) ?? [],
      openBranchCount: (openBranchTeamsByDeck.get(d.deck.id) ?? []).reduce(
        (total, team) => total + team.count,
        0,
      ),
      openChangeRequestCount: openChangeRequestsByDeck.get(d.deck.id) ?? 0,
    }));

    return c.json({
      data: dataWithPrices,
      pagination: {
        limit,
        offset,
        hasMore: decks.length === limit,
      },
    });
  },
);
