import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AuthExtension } from '../../../../auth/auth.ts';
import { zDeckFolderId, zDeckFolderSharingRequest } from '../../../../../types/DeckFolder.ts';
import { saveDeckFolderSharing } from '../../../../lib/decks/deckFolders.ts';

export const deckFolderSharingPutRoute = new Hono<AuthExtension>().put(
  '/',
  zValidator('param', z.object({ id: zDeckFolderId })),
  zValidator('json', zDeckFolderSharingRequest),
  async c => {
    const user = c.get('user');
    if (!user) return c.json({ message: 'Unauthorized' }, 401);
    const result = await saveDeckFolderSharing(
      user.id,
      c.req.valid('param').id,
      c.req.valid('json'),
    );
    if (result === 'not_found') return c.json({ message: 'Folder not found' }, 404);
    if (result === 'forbidden_team')
      return c.json({ message: 'You can only share with teams you belong to' }, 403);
    return c.json({ data: { id: c.req.valid('param').id } });
  },
);
