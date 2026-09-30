import { asc, eq } from 'drizzle-orm';
import { db } from '../../db';
import { eventHighlight } from '../../db/schema/event_highlight.ts';
import type { EventHighlightInput } from '../../../types/EventHighlight.ts';

export const eventHighlightService = {
  list: () =>
    db.select().from(eventHighlight).orderBy(asc(eventHighlight.date), asc(eventHighlight.id)),
  async create(input: EventHighlightInput) {
    const [row] = await db.insert(eventHighlight).values(input).returning();
    return row;
  },
  async update(id: string, input: EventHighlightInput) {
    const [row] = await db
      .update(eventHighlight)
      .set({ ...input, updatedAt: new Date().toISOString() })
      .where(eq(eventHighlight.id, id))
      .returning();
    return row;
  },
  async remove(id: string) {
    const rows = await db
      .delete(eventHighlight)
      .where(eq(eventHighlight.id, id))
      .returning({ id: eventHighlight.id });
    return rows.length > 0;
  },
};
