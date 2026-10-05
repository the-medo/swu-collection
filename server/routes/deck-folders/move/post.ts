import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import type { AuthExtension } from '../../../auth/auth.ts';
import { zMoveDecksToFolderRequest } from '../../../../types/DeckFolder.ts';
import { moveDecksToFolder } from '../../../lib/decks/deckFolders.ts';

export const moveDecksToFolderRoute = new Hono<AuthExtension>().post(
  '/',
  zValidator('json', zMoveDecksToFolderRequest),
  async c => {
    const user = c.get('user');
    if (!user) return c.json({ message: 'Unauthorized' }, 401);
    const input = c.req.valid('json');
    if (!(await moveDecksToFolder(user.id, input)))
      return c.json({ message: 'One or more decks or the destination folder were not found' }, 404);
    return c.json({ data: { deckIds: input.deckIds, folderId: input.folderId } });
  },
);
