import { Hono } from 'hono';
import type { AuthExtension } from '../../../auth/auth.ts';
import { eq } from 'drizzle-orm';
import { meta as metaTable } from '../../../db/schema/meta.ts';
import { format as formatTable } from '../../../db/schema/format.ts';
import { db } from '../../../db';
import { selectMeta, selectFormat } from '../../meta.ts';

export const metaIdGetRoute = new Hono<AuthExtension>().get('/', async c => {
  const id = Number(c.req.param('id'));
  
  if (isNaN(id)) {
    return c.json({ message: 'Invalid ID format' }, 400);
  }

  const result = await db
    .select({
      meta: selectMeta,
      format: selectFormat,
    })
    .from(metaTable)
    .innerJoin(formatTable, eq(metaTable.format, formatTable.id))
    .where(eq(metaTable.id, id))
    .limit(1);

  if (result.length === 0) {
    return c.json({ message: 'Meta not found' }, 404);
  }

  return c.json({ data: result[0] });
});