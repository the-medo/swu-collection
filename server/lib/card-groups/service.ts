import { and, desc, eq, lt, or, sql } from 'drizzle-orm';
import { db } from '../../db';
import { cardGroup } from '../../db/schema/card_group.ts';
import { getMergedCardList } from '../cards/cardListProvider.ts';
import { indexCardPrintings } from '../../../shared/lib/cardGroupPrintings.ts';
import type {
  CardGroup,
  CardGroupCursor,
  CardGroupInput,
  CardGroupPage,
} from '../../../types/CardGroup.ts';
import { CardGroupValidationError } from './errors.ts';

async function validateVariants(input: CardGroupInput) {
  const index = indexCardPrintings(await getMergedCardList());
  const missing = input.variantIds.filter(id => !index.has(id));
  if (missing.length)
    throw new CardGroupValidationError(
      `Unknown card versions: ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? '…' : ''}`,
    );
}

export const cardGroupService = {
  async feed(cursor?: CardGroupCursor): Promise<CardGroupPage> {
    const rows = await db
      .select()
      .from(cardGroup)
      .where(
        and(
          eq(cardGroup.published, true),
          cursor
            ? or(
                lt(cardGroup.sortOrder, cursor.sortOrder),
                and(
                  eq(cardGroup.sortOrder, cursor.sortOrder),
                  or(
                    lt(cardGroup.updatedAt, cursor.updatedAt),
                    and(eq(cardGroup.updatedAt, cursor.updatedAt), lt(cardGroup.id, cursor.id)),
                  ),
                ),
              )
            : undefined,
        ),
      )
      .orderBy(desc(cardGroup.sortOrder), desc(cardGroup.updatedAt), desc(cardGroup.id))
      .limit(6);
    const last = rows[4];
    return {
      data: rows.slice(0, 5),
      nextCursor:
        rows.length > 5 && last
          ? JSON.stringify({
              id: last.id,
              sortOrder: last.sortOrder,
              // Preserve PostgreSQL microseconds so equal-time groups paginate reliably.
              updatedAt: `${last.updatedAt.replace(' ', 'T').replace(/Z$/, '')}Z`,
            })
          : null,
    };
  },
  list: (publishedOnly: boolean) =>
    db
      .select()
      .from(cardGroup)
      .where(publishedOnly ? eq(cardGroup.published, true) : undefined)
      .orderBy(desc(cardGroup.sortOrder), desc(cardGroup.updatedAt), desc(cardGroup.id)),
  async getPublished(id: string): Promise<CardGroup | undefined> {
    const [row] = await db
      .select()
      .from(cardGroup)
      .where(and(eq(cardGroup.id, id), eq(cardGroup.published, true)));
    return row;
  },
  async create(input: CardGroupInput) {
    await validateVariants(input);
    const [row] = await db.insert(cardGroup).values(input).returning();
    return row;
  },
  async update(id: string, input: CardGroupInput): Promise<CardGroup | undefined> {
    await validateVariants(input);
    const [row] = await db
      .update(cardGroup)
      .set({ ...input, updatedAt: sql`now()` })
      .where(eq(cardGroup.id, id))
      .returning();
    return row;
  },
  async remove(id: string) {
    const rows = await db
      .delete(cardGroup)
      .where(eq(cardGroup.id, id))
      .returning({ id: cardGroup.id });
    return rows.length > 0;
  },
};
export type CardGroupService = typeof cardGroupService;
