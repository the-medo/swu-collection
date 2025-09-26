import { Hono } from 'hono';
import type { AuthExtension } from '../auth/auth.ts';
import { getTableColumns } from 'drizzle-orm';
import { collection as collectionTable } from '../db/schema/collection.ts';
import { collectionGetRoute } from './collection/get.ts';
import { collectionPostRoute } from './collection/post.ts';
import { collectionIdBulkPostRoute } from './collection/_id/bulk/post.ts';
import { collectionIdCardDeleteRoute } from './collection/_id/card/delete.ts';
import { collectionIdCardGetRoute } from './collection/_id/card/get.ts';
import { collectionIdCardPostRoute } from './collection/_id/card/post.ts';
import { collectionIdCardPutRoute } from './collection/_id/card/put.ts';
import { collectionIdDuplicatePostRoute } from './collection/_id/duplicate/post.ts';
import { collectionIdImportPostRoute } from './collection/_id/import/post.ts';
import { collectionIdDeleteRoute } from './collection/_id/delete.ts';
import { collectionIdGetRoute } from './collection/_id/get.ts';
import { collectionIdPutRoute } from './collection/_id/put.ts';
import { collectionsBulkDataPostRoute } from './collection/bulk/data/post.ts';
import { collectionIdMultiplePostRoute } from './collection/_id/multiple/post.ts';
import { collectionIdSourceGetRoute } from './collection/_id/source/get.ts';
import { collectionIdSourceDisplayPostRoute } from './collection/_id/source/display/post.ts';
import { collectionIdSourcePostRoute } from './collection/_id/source/post.ts';
import { collectionIdApplyPostRoute } from './collection/_id/apply/post.ts';

export const selectCollection = getTableColumns(collectionTable);

export const collectionRoute = new Hono<AuthExtension>()
  .route('/', collectionGetRoute)
  .route('/', collectionPostRoute)
  .route('/bulk/data', collectionsBulkDataPostRoute)
  .route('/:id', collectionIdDeleteRoute)
  .route('/:id', collectionIdGetRoute)
  .route('/:id', collectionIdPutRoute)
  .route('/:id/bulk', collectionIdBulkPostRoute)
  .route('/:id/card', collectionIdCardDeleteRoute)
  .route('/:id/card', collectionIdCardGetRoute)
  .route('/:id/card', collectionIdCardPostRoute)
  .route('/:id/card', collectionIdCardPutRoute)
  .route('/:id/duplicate', collectionIdDuplicatePostRoute)
  .route('/:id/import', collectionIdImportPostRoute)
  .route('/:id/multiple', collectionIdMultiplePostRoute)
  .route('/:id/source', collectionIdSourceGetRoute)
  .route('/:id/source', collectionIdSourcePostRoute)
  .route('/:id/source/display', collectionIdSourceDisplayPostRoute)
  .route('/:id/apply', collectionIdApplyPostRoute);
