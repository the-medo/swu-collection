import type { Context } from 'hono';
import type { AuthExtension } from './auth.ts';
import { userHasAdminAccess } from '../lib/utils/userHasAdminAccess.ts';

export async function requireAdmin(c: Context<AuthExtension>) {
  const user = c.get('user');

  if (!user) {
    return {
      user: null,
      response: c.json({ message: 'Unauthorized' }, 401),
    } as const;
  }

  const hasAdminAccess = await userHasAdminAccess(user.id);

  if (!hasAdminAccess) {
    return {
      user: null,
      response: c.json({ message: 'Forbidden' }, 403),
    } as const;
  }

  return { user, response: null } as const;
}
