import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AuthExtension } from '../../../auth/auth.ts';
import { zDeckFolderId } from '../../../../types/DeckFolder.ts';
import { getSharedDeckFolder } from '../../../lib/decks/deckFolders.ts';

export const deckFolderGetRoute = new Hono<AuthExtension>().get(
  '/',
  zValidator('param', z.object({ id: zDeckFolderId })),
  async c => {
    c.header('Cache-Control', 'private, no-store');
    const folder = await getSharedDeckFolder(c.req.valid('param').id, c.get('user')?.id);
    if (!folder) return c.json({ message: 'Folder not found or you do not have access' }, 404);
    return c.json({ data: folder });
  },
);
