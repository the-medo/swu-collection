import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import type { AuthExtension } from '../../auth/auth.ts';
import { zDeckFolderRequest } from '../../../types/DeckFolder.ts';
import { saveDeckFolder } from '../../lib/decks/deckFolders.ts';

export const deckFoldersPostRoute = new Hono<AuthExtension>().post(
  '/',
  zValidator('json', zDeckFolderRequest),
  async c => {
    const user = c.get('user');
    if (!user) return c.json({ message: 'Unauthorized' }, 401);
    const result = await saveDeckFolder(user.id, c.req.valid('json'));
    if (result.status !== 'ok') return c.json({ message: 'Parent folder not found' }, 404);
    return c.json({ data: { id: result.id, parentId: result.parentId } }, 201);
  },
);
