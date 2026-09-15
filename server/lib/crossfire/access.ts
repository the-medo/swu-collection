import type { Sql, TransactionSql } from 'postgres';
import type { Role } from 'better-auth/plugins/access';
import { applicationRoles } from '../../auth/permissions.ts';
import {
  hasCrossfireAccess,
  userRoles,
  withCrossfireAccess,
} from '../../../shared/lib/auth/roles.ts';
import type { CrossfireAccessUser } from '../../../shared/types/crossfire-access.ts';
import type { Principal } from './lobbies.ts';

export class CrossfireAccessError extends Error {
  constructor(readonly status: 401 | 403 | 404) {
    super(status === 401 ? 'Unauthorized' : status === 403 ? 'Forbidden' : 'User not found');
  }
}
type Account = {
  id: string;
  name: string;
  email: string;
  role: string | null;
  banned: boolean | null;
};
function view(account: Account): CrossfireAccessUser {
  return {
    id: account.id,
    name: account.name,
    email: account.email,
    roles: userRoles(account.role),
    enabled: hasCrossfireAccess(account.role),
  };
}
/** This permission stays independent of Crossfire membership so admins can grant themselves access. */
function requireManager(account: Account | undefined) {
  const roles = applicationRoles as Record<string, Role>;
  if (!account || account.banned) throw new CrossfireAccessError(401);
  if (
    !userRoles(account.role).some(
      role => Object.hasOwn(roles, role) && roles[role]!.authorize({ user: ['set-role'] }).success,
    )
  )
    throw new CrossfireAccessError(403);
}
async function lockSession(tx: TransactionSql, principal: Principal) {
  const [session] =
    await tx`SELECT id FROM public.session WHERE id=${principal.sessionId} AND user_id=${principal.userId} AND expires_at > clock_timestamp() FOR SHARE`;
  if (!session) throw new CrossfireAccessError(401);
}
export class CrossfireAccess {
  constructor(private readonly sql: Sql) {}
  async list(
    principal: Principal,
    search: string,
  ): Promise<{ users: CrossfireAccessUser[]; hasMore: boolean }> {
    return this.sql.begin(async tx => {
      await lockSession(tx, principal);
      const [actor] = await tx<
        Account[]
      >`SELECT id,name,email,role,banned FROM public."user" WHERE id=${principal.userId} FOR SHARE`;
      requireManager(actor);
      // Search is literal text; SQL parameters and escaped wildcards prevent query injection.
      const pattern = `%${search.replace(/[\\%_]/g, '\\$&')}%`;
      const users = await tx<Account[]>`SELECT id,name,email,role,banned FROM public."user"
        WHERE name ILIKE ${pattern} OR display_name ILIKE ${pattern} OR email ILIKE ${pattern}
        ORDER BY (id=${principal.userId}) DESC, name, id LIMIT 26`;
      return { users: users.slice(0, 25).map(view), hasMore: users.length > 25 };
    });
  }
  async set(
    principal: Principal,
    targetId: string,
    enabled: boolean,
  ): Promise<CrossfireAccessUser> {
    return this.sql.begin(async tx => {
      await lockSession(tx, principal);
      // Stable lock order handles self-grants and concurrent admins. Read-modify-write
      // keeps unrelated roles even when another role update is already in progress.
      const users = await tx<
        Account[]
      >`SELECT id,name,email,role,banned FROM public."user" WHERE id = ANY(${[...new Set([principal.userId, targetId])]}) ORDER BY id FOR UPDATE`;
      requireManager(users.find(u => u.id === principal.userId));
      await lockSession(tx, principal); // Recheck expiry after waiting for account locks.
      const target = users.find(u => u.id === targetId);
      if (!target) throw new CrossfireAccessError(404);
      const role = withCrossfireAccess(target.role, enabled);
      await tx`UPDATE public."user" SET role=${role}, updated_at=now() WHERE id=${targetId}`;
      return view({ ...target, role });
    });
  }
}
