import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AuthExtension } from '../../auth/auth.ts';
import { SwuSet } from '../../../types/enums.ts';
import { Visibility } from '../../../shared/types/visibility.ts';
import {
  CARD_POOL_BOOSTER_COUNTS,
  CardPoolType,
  DEFAULT_CARD_POOL_BOOSTER_COUNT,
  MAX_CUSTOM_CARD_POOL_SIZE,
} from '../../../shared/types/cardPools.ts';
import { db } from '../../db';
import {
  cardPools as cardPoolsTable,
  cardPoolCards as cardPoolCardsTable,
} from '../../db/schema/card_pool.ts';
import {
  generateCardPool,
  transformCardPoolToCardPoolCards,
  filterLeadersFromCardPool,
} from '../../lib/card-pools/generate-card-pool.ts';
import { cardList } from '../../db/lists.ts';
import { getMergedCardList } from '../../lib/cards/cardListProvider.ts';
import {
  describeCustomCardPoolValidation,
  isCustomCardPoolValidationSuccessful,
  validateCustomCardPoolCards,
} from '../../lib/card-pools/validate-card-ids.ts';

export const zCardPoolCreate = z
  .object({
    set: z.enum(SwuSet),
    type: z.enum(CardPoolType),
    name: z.string().min(1).max(200).optional(),
    description: z.string().max(2000).optional(),
    visibility: z.enum(Visibility).default(Visibility.Unlisted),
    custom: z.boolean().default(false),
    boosterCount: z.literal(CARD_POOL_BOOSTER_COUNTS).optional(),
    cards: z.array(z.string().min(1)).min(1).max(MAX_CUSTOM_CARD_POOL_SIZE).optional(),
  })
  .superRefine((body, ctx) => {
    if (body.type === CardPoolType.Draft) {
      ctx.addIssue({
        code: 'custom',
        path: ['type'],
        message: 'Draft card pools are not implemented yet',
      });
    }

    if (body.custom) {
      if (body.boosterCount !== undefined) {
        ctx.addIssue({
          code: 'custom',
          path: ['boosterCount'],
          message: 'Custom card pools cannot specify a booster count',
        });
      }
      return;
    }

    if (body.cards !== undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['cards'],
        message: 'Generated card pools cannot specify cards',
      });
    }

    if (
      body.type === CardPoolType.Prerelease &&
      body.boosterCount !== undefined &&
      body.boosterCount !== DEFAULT_CARD_POOL_BOOSTER_COUNT
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['boosterCount'],
        message: 'Prerelease card pools always use six booster packs',
      });
    }
  });
export type CardPoolCreate = z.infer<typeof zCardPoolCreate>;

export const cardPoolsPostRoute = new Hono<AuthExtension>().post(
  '/',
  zValidator('json', zCardPoolCreate),
  async c => {
    const user = c.get('user');
    if (!user) return c.json({ message: 'Unauthorized' }, 401);

    const body = c.req.valid('json');
    const defaultName = `${body.set} ${body.type}`;

    try {
      const pool = body.custom
        ? (body.cards ?? [])
        : generateCardPool(
            body.set,
            body.type,
            body.boosterCount ?? DEFAULT_CARD_POOL_BOOSTER_COUNT,
          );
      const resolvedCardList = body.custom && body.cards ? await getMergedCardList() : cardList;

      if (body.custom && body.cards) {
        const validation = validateCustomCardPoolCards(body.cards, body.set, resolvedCardList);
        if (!isCustomCardPoolValidationSuccessful(validation)) {
          return c.json({ message: describeCustomCardPoolValidation(validation), validation }, 400);
        }
      }

      const result = await db.transaction(async tx => {
        const leaders = filterLeadersFromCardPool(pool, resolvedCardList).join(',');
        const status = body.custom && !body.cards ? 'in_progress' : 'ready';

        const [created] = await tx
          .insert(cardPoolsTable)
          .values({
            userId: user.id,
            set: body.set,
            type: body.type,
            name: body.name ?? defaultName,
            description: body.description ?? '',
            leaders,
            edited: false,
            custom: body.custom ?? false,
            status,
            visibility: body.visibility,
          })
          .returning();

        if (!created) throw new Error('Failed to create card pool');

        if (pool.length > 0) {
          const inserts = transformCardPoolToCardPoolCards(pool, created.id);
          await tx.insert(cardPoolCardsTable).values(inserts);
        }

        return created;
      });

      return c.json({ data: result }, 201);
    } catch (e) {
      return c.json({ message: 'Failed to create card pool' }, 500);
    }
  },
);
