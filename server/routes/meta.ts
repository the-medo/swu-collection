import { getTableColumns } from 'drizzle-orm';
import { meta as metaTable } from '../db/schema/meta.ts';
import { format as formatTable } from '../db/schema/format.ts';
import { Hono } from 'hono';
import type { AuthExtension } from '../auth/auth.ts';
import { metaGetRoute } from './meta/get.ts';
import { metaPostRoute } from './meta/post.ts';
import { metaIdGetRoute } from './meta/_id/get.ts';
import { metaIdPutRoute } from './meta/_id/put.ts';
import { metaIdDeleteRoute } from './meta/_id/delete.ts';

export const selectMeta = getTableColumns(metaTable);
export const selectFormat = getTableColumns(formatTable);

export const metaRoute = new Hono<AuthExtension>()
  .route('/', metaGetRoute)
  .route('/', metaPostRoute)
  .route('/:id', metaIdGetRoute)
  .route('/:id', metaIdPutRoute)
  .route('/:id', metaIdDeleteRoute);