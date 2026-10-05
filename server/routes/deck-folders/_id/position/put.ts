import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import type { AuthExtension } from '../../../../auth/auth.ts';
import { zDeckFolderId, zDeckFolderPositionRequest } from '../../../../../types/DeckFolder.ts';
import { positionDeckFolder } from '../../../../lib/decks/deckFolders.ts';

export const deckFolderPositionRoute = new Hono<AuthExtension>().put(
  '/',
  zValidator('param', z.object({ id: zDeckFolderId })),
  zValidator('json', zDeckFolderPositionRequest),
  async c => {
    const user = c.get('user');
    if (!user) return c.json({ message: 'Unauthorized' }, 401);
    const result = await positionDeckFolder(user.id, c.req.valid('param').id, c.req.valid('json'));
    if (result.status === 'not_found') return c.json({ message: 'Folder not found' }, 404);
    if (result.status === 'cycle')
      return c.json({ message: 'A folder cannot be moved inside itself or its subfolders' }, 409);
    return c.json({ data: { id: result.id, parentId: result.parentId } });
  },
);
