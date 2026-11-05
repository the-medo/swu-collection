import { and, eq, gt } from 'drizzle-orm';
import type { db } from '../../db';
import { user } from '../../db/schema/auth-schema.ts';
import { integrationApp, integrationAppConnection } from '../../db/schema/integration_app.ts';
import { hasActiveAccountRestriction } from '../../auth/accountRestriction.ts';
import type { IntegrationAppScope } from '../../../shared/types/integrationApp.ts';
import { IntegrationAppError } from './errors.ts';
import { hashIntegrationSecret } from './crypto.ts';

export type Executor = Pick<typeof db, 'select' | 'insert' | 'update' | 'delete' | 'execute'>;
export type AuthenticatedRequestLimit = (connectionKey: string) => void;

export async function assertActiveUser(executor: Executor, userId: string) {
  const [account] = await executor
    .select({ id: user.id, banned: user.banned, banExpires: user.banExpires })
    .from(user)
    .where(eq(user.id, userId));
  if (!account || hasActiveAccountRestriction(account))
    throw new IntegrationAppError('Account access is unavailable.', 403);
}

// Mutating flows lock the app before the connection. Keep this order across
// management, grant exchange and resource writes so revocation stays atomic.
export async function activeApp(executor: Executor, clientId: string, lock = false) {
  const query = executor.select().from(integrationApp).where(eq(integrationApp.clientId, clientId));
  const [app] = await (lock ? query.for('share') : query);
  if (!app || app.disabled) throw new IntegrationAppError('App is unavailable.', 404);
  await assertActiveUser(executor, app.ownerId);
  return app;
}

export async function authorizeToken(
  executor: Executor,
  accessToken: string,
  scope: IntegrationAppScope,
  lock = false,
  onAuthenticated?: AuthenticatedRequestLimit,
) {
  const hash = hashIntegrationSecret(accessToken);
  const [candidate] = await executor
    .select({ clientId: integrationAppConnection.clientId })
    .from(integrationAppConnection)
    .where(eq(integrationAppConnection.accessTokenHash, hash));
  if (!candidate) throw new IntegrationAppError('Invalid access token.', 401);
  const app = await activeApp(executor, candidate.clientId, lock);
  const query = executor
    .select()
    .from(integrationAppConnection)
    .where(
      and(
        eq(integrationAppConnection.clientId, app.clientId),
        eq(integrationAppConnection.accessTokenHash, hash),
        gt(integrationAppConnection.accessExpiresAt, new Date()),
      ),
    );
  const [connection] = await (lock ? query.for('update') : query);
  if (!connection) throw new IntegrationAppError('Invalid or expired access token.', 401);
  await assertActiveUser(executor, connection.userId);
  // Authenticated attempts count even when the requested scope was not granted.
  onAuthenticated?.(`${app.clientId}:${connection.userId}`);
  if (!connection.scopes.includes(scope) || !app.scopes.includes(scope))
    throw new IntegrationAppError('Required permission was not granted.', 403);
  return { app, connection };
}
