import { Hono } from 'hono';
import type { AuthExtension } from '../../auth/auth.ts';
import { zValidator } from '@hono/zod-validator';
import { and, eq, gt, or, sql } from 'drizzle-orm';
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

export const zDeckQueryParams = zPaginationParams.extend({
  userId: z.string().optional(),
  favorite: z.preprocess(
    // Convert string "false" to boolean false
    val => {
      if (val === 'false') return false;
      if (val === 'true') return true;
      return val;
    },
    z.boolean().optional().default(false),
  ),
  format: z.coerce.number().int().positive().optional(),
  leaders: z
    .string()
    .optional()
    .transform(val => (val ? val.split(',') : undefined)),
  base: z.string().optional(),
  baseAspect: z.nativeEnum(SwuAspect).optional(),
  aspects: z
    .string()
    .optional()
    .transform(val => (val ? val.split(',').map(a => a.trim()) : undefined)),
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

    return c.json({
      data: decks,
      pagination: {
        limit,
        offset,
        hasMore: decks.length === limit,
      },
    });
  },
);
