import { Hono } from 'hono';
import type { AuthExtension } from '../../auth/auth.ts';
import { listDeckFolders } from '../../lib/decks/deckFolders.ts';

export const deckFoldersGetRoute = new Hono<AuthExtension>().get('/', async c => {
  const user = c.get('user');
  if (!user) return c.json({ message: 'Unauthorized' }, 401);
  return c.json({ data: await listDeckFolders(user.id) });
});
