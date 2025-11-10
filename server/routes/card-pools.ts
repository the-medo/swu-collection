import { Hono } from 'hono';
import type { AuthExtension } from '../auth/auth.ts';
import { cardPoolsGetRoute } from './card-pools/get.ts';
import { cardPoolsPostRoute } from './card-pools/post.ts';
import { cardPoolsIdGetRoute } from './card-pools/_id/get.ts';
import { cardPoolsIdPatchRoute } from './card-pools/_id/patch.ts';
import { cardPoolsIdDeleteRoute } from './card-pools/_id/delete.ts';
import { cardPoolsIdCardsGetRoute } from './card-pools/_id/cards/get.ts';
import { cardPoolsIdCardsPutRoute } from './card-pools/_id/cards/put.ts';
import { cardPoolsIdDecksGetRoute } from './card-pools/_id/decks/get.ts';
import { cardPoolsIdDecksPostRoute } from './card-pools/_id/decks/post.ts';
import { cardPoolsIdDecksDeckIdPatchRoute } from './card-pools/_id/decks/_deckId/patch.ts';
import { cardPoolsIdDecksDeckIdDeleteRoute } from './card-pools/_id/decks/_deckId/delete.ts';
import { cardPoolsIdDecksDeckIdCardPatchRoute } from './card-pools/_id/decks/_deckId/card/patch.ts';
import { cardPoolsIdDecksDeckIdCardGetRoute } from './card-pools/_id/decks/_deckId/card/get.ts';

export const cardPoolsRoute = new Hono<AuthExtension>()
  .route('/', cardPoolsGetRoute)
  .route('/', cardPoolsPostRoute)
  .route('/:id', cardPoolsIdGetRoute)
  .route('/:id', cardPoolsIdPatchRoute)
  .route('/:id', cardPoolsIdDeleteRoute)
  .route('/:id/cards', cardPoolsIdCardsGetRoute)
  .route('/:id/cards', cardPoolsIdCardsPutRoute)
  .route('/:id/decks', cardPoolsIdDecksGetRoute)
  .route('/:id/decks', cardPoolsIdDecksPostRoute)
  .route('/:id/decks/:deckId', cardPoolsIdDecksDeckIdPatchRoute)
  .route('/:id/decks/:deckId', cardPoolsIdDecksDeckIdDeleteRoute)
  .route('/:id/decks/:deckId/card', cardPoolsIdDecksDeckIdCardPatchRoute)
  .route('/:id/decks/:deckId/card', cardPoolsIdDecksDeckIdCardGetRoute);
