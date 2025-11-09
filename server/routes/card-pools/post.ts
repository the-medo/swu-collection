import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AuthExtension } from '../../auth/auth.ts';
import { SwuSet } from '../../../types/enums.ts';
import { Visibility } from '../../../shared/types/visibility.ts';
import { CardPoolType } from '../../../shared/types/cardPools.ts';
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

export const zCardPoolCreate = z.object({
  set: z.enum(SwuSet),
  type: z.enum(CardPoolType),
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  visibility: z.enum(Visibility).default(Visibility.Unlisted),
  custom: z.boolean().default(false),
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
      const result = await db.transaction(async tx => {
        // Generate the card pool and seed cards
        const pool = body.custom ? generateCardPool(body.set, body.type) : [];
        const leaders = filterLeadersFromCardPool(pool).join(',');

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
            status: body.custom ? 'in_progress' : 'ready',
            visibility: body.visibility,
          })
          .returning();

        if (!created) throw new Error('Failed to create card pool');

        if (!body.custom) {
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
