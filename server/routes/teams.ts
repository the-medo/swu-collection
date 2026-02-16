import { Hono } from 'hono';
import type { AuthExtension } from '../auth/auth.ts';
import { teamsPostRoute } from './teams/post.ts';
import { teamsGetRoute } from './teams/get.ts';
import { teamsIdGetRoute } from './teams/_id/get.ts';
import { teamsIdPatchRoute } from './teams/_id/patch.ts';
import { teamsIdLogoPostRoute } from './teams/_id/logo/post.ts';
import { teamsIdMembersGetRoute } from './teams/_id/members/get.ts';
import { teamsIdMembersUserIdPatchRoute } from './teams/_id/members/_userId/patch.ts';
import { teamsIdMembersUserIdDeleteRoute } from './teams/_id/members/_userId/delete.ts';
import { teamsIdJoinRequestPostRoute } from './teams/_id/join-request/post.ts';
import { teamsIdJoinRequestGetRoute } from './teams/_id/join-request/get.ts';
import { teamsIdJoinRequestRequestIdPatchRoute } from './teams/_id/join-request/_requestId/patch.ts';
import { teamsIdJoinRequestRequestIdDeleteRoute } from './teams/_id/join-request/_requestId/delete.ts';
import { teamsIdDecksGetRoute } from './teams/_id/decks/get.ts';
import { teamsIdDeckMapGetRoute } from './teams/_id/deck-map/get.ts';
import { teamsIdDecksPostRoute } from './teams/_id/decks/post.ts';
import { teamsIdDecksDeckIdDeleteRoute } from './teams/_id/decks/_deckId/delete.ts';

export const teamsRoute = new Hono<AuthExtension>()
  .route('/', teamsPostRoute)
  .route('/', teamsGetRoute)
  .route('/:id', teamsIdGetRoute)
  .route('/:id', teamsIdPatchRoute)
  .route('/:id/logo', teamsIdLogoPostRoute)
  .route('/:id/members', teamsIdMembersGetRoute)
  .route('/:id/members/:userId', teamsIdMembersUserIdPatchRoute)
  .route('/:id/members/:userId', teamsIdMembersUserIdDeleteRoute)
  .route('/:id/join-request', teamsIdJoinRequestPostRoute)
  .route('/:id/join-request', teamsIdJoinRequestGetRoute)
  .route('/:id/join-request/:requestId', teamsIdJoinRequestRequestIdPatchRoute)
  .route('/:id/join-request/:requestId', teamsIdJoinRequestRequestIdDeleteRoute)
  .route('/:id/deck-map', teamsIdDeckMapGetRoute)
  .route('/:id/decks', teamsIdDecksGetRoute)
  .route('/:id/decks', teamsIdDecksPostRoute)
  .route('/:id/decks/:deckId', teamsIdDecksDeckIdDeleteRoute);
