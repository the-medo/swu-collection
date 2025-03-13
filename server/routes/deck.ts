import { getTableColumns } from 'drizzle-orm';
import { deck as deckTable } from '../db/schema/deck.ts';
import { Hono } from 'hono';
import type { AuthExtension } from '../auth/auth.ts';
import { deckGetRoute } from './decks/get.ts';
import { deckPostRoute } from './decks/post.ts';
import { deckIdGetRoute } from './decks/_id/get.ts';
import { deckIdPutRoute } from './decks/_id/put.ts';
import { deckIdDeleteRoute } from './decks/_id/delete.ts';
import { deckIdCardGetRoute } from './decks/_id/card/get.ts';
import { deckIdCardPostRoute } from './decks/_id/card/post.ts';
import { deckIdCardPutRoute } from './decks/_id/card/put.ts';
import { deckIdCardDeleteRoute } from './decks/_id/card/delete.ts';
import { deckIdDuplicatePostRoute } from './decks/_id/duplicate/post.ts';
import { decksImportSwudbPostRoute } from './decks/import-swudb/post.ts';

export const selectDeck = getTableColumns(deckTable);

export const deckRoute = new Hono<AuthExtension>()
  .route('/', deckGetRoute)
  .route('/', deckPostRoute)
  .route('/:id', deckIdGetRoute)
  .route('/:id', deckIdPutRoute)
  .route('/:id', deckIdDeleteRoute)
  .route('/:id/card', deckIdCardGetRoute)
  .route('/:id/card', deckIdCardPostRoute)
  .route('/:id/card', deckIdCardPutRoute)
  .route('/:id/card', deckIdCardDeleteRoute)
  .route('/:id/duplicate', deckIdDuplicatePostRoute)
  .route('/import-swudb', decksImportSwudbPostRoute);
