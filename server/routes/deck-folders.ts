import { Hono } from 'hono';
import type { AuthExtension } from '../auth/auth.ts';
import { deckFoldersGetRoute } from './deck-folders/get.ts';
import { deckFoldersPostRoute } from './deck-folders/post.ts';
import { deckFolderPutRoute } from './deck-folders/_id/put.ts';
import { deckFolderDeleteRoute } from './deck-folders/_id/delete.ts';
import { moveDecksToFolderRoute } from './deck-folders/move/post.ts';
import { deckFolderPositionRoute } from './deck-folders/_id/position/put.ts';

export const deckFoldersRoute = new Hono<AuthExtension>()
  .route('/', deckFoldersGetRoute)
  .route('/', deckFoldersPostRoute)
  .route('/move', moveDecksToFolderRoute)
  .route('/:id/position', deckFolderPositionRoute)
  .route('/:id', deckFolderPutRoute)
  .route('/:id', deckFolderDeleteRoute);
