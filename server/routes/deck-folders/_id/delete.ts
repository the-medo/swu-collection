import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import type { AuthExtension } from '../../../auth/auth.ts';
import { zDeckFolderId } from '../../../../types/DeckFolder.ts';
import { removeDeckFolder } from '../../../lib/decks/deckFolders.ts';

export const deckFolderDeleteRoute = new Hono<AuthExtension>().delete(
  '/',
  zValidator('param', z.object({ id: zDeckFolderId })),
  async c => {
    const user = c.get('user');
    if (!user) return c.json({ message: 'Unauthorized' }, 401);
    const id = c.req.valid('param').id;
    if (!(await removeDeckFolder(user.id, id))) return c.json({ message: 'Folder not found' }, 404);
    return c.json({ data: { id } });
  },
);
