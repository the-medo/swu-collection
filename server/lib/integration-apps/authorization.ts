import { and, eq, gt, lt } from 'drizzle-orm';
import type { z } from 'zod';
import { db } from '../../db';
import {
  integrationApp,
  integrationAppCode,
  integrationAppConnection,
  integrationAppRefreshUse,
} from '../../db/schema/integration_app.ts';
import type {
  integrationAuthorizeSchema,
  integrationTokenSchema,
} from '../../../shared/types/integrationApp.ts';
import { activeApp, assertActiveUser, type AuthenticatedRequestLimit } from './access.ts';
import { IntegrationAppError } from './errors.ts';
import { hashIntegrationSecret, matchesIntegrationSecret, newIntegrationSecret } from './crypto.ts';

type App = typeof integrationApp.$inferSelect;
type Authorization = z.output<typeof integrationAuthorizeSchema>;
type TokenRequest = z.infer<typeof integrationTokenSchema>;

function validateAuthorization(app: App, input: Authorization) {
  // Exact matching is intentional, including the port of localhost callbacks.
  if (!app.redirectUris.includes(input.redirect_uri))
    throw new IntegrationAppError('Callback URL is not registered for this app.');
  if (!input.scope.every(scope => app.scopes.includes(scope)))
    throw new IntegrationAppError('App cannot request these permissions.');
}

function tokens() {
  const access = newIntegrationSecret('swu_access');
  const refresh = newIntegrationSecret('swu_refresh');
  return {
    response: {
      access_token: access,
      refresh_token: refresh,
      token_type: 'Bearer' as const,
      expires_in: 3600,
    },
    stored: {
      accessTokenHash: hashIntegrationSecret(access),
      refreshTokenHash: hashIntegrationSecret(refresh),
      accessExpiresAt: new Date(Date.now() + 3600_000),
      refreshExpiresAt: new Date(Date.now() + 30 * 86400_000),
    },
  };
}

export const appAuthorizationService = {
  async authorization(input: Authorization) {
    const app = await activeApp(db, input.client_id);
    validateAuthorization(app, input);
    return {
      app: { clientId: app.clientId, name: app.name, description: app.description },
      redirectUri: input.redirect_uri,
      scopes: input.scope,
    };
  },

  async consent(userId: string, input: Authorization, accept: boolean) {
    return db.transaction(async tx => {
      const app = await activeApp(tx, input.client_id, true);
      validateAuthorization(app, input);
      await assertActiveUser(tx, userId);
      const redirect = new URL(input.redirect_uri);
      // Do not preserve callback query keys that could masquerade as a response.
      for (const key of ['code', 'error', 'state']) redirect.searchParams.delete(key);
      redirect.searchParams.set('state', input.state);
      if (!accept) {
        redirect.searchParams.set('error', 'access_denied');
        return { redirectUrl: redirect.href };
      }
      const code = newIntegrationSecret('swu_code');
      await tx
        .delete(integrationAppCode)
        .where(
          and(
            eq(integrationAppCode.clientId, app.clientId),
            lt(integrationAppCode.expiresAt, new Date()),
          ),
        );
      await tx
        .insert(integrationAppCode)
        .values({
          codeHash: hashIntegrationSecret(code),
          clientId: app.clientId,
          userId,
          scopes: input.scope,
          redirectUri: input.redirect_uri,
          expiresAt: new Date(Date.now() + 5 * 60_000),
        })
        .onConflictDoUpdate({
          target: [integrationAppCode.clientId, integrationAppCode.userId],
          set: {
            codeHash: hashIntegrationSecret(code),
            scopes: input.scope,
            redirectUri: input.redirect_uri,
            expiresAt: new Date(Date.now() + 5 * 60_000),
          },
        });
      redirect.searchParams.set('code', code);
      return { redirectUrl: redirect.href };
    });
  },

  async exchange(input: TokenRequest, onAuthenticated?: AuthenticatedRequestLimit) {
    const result = await db.transaction(async tx => {
      const app = await activeApp(tx, input.client_id, true);
      if (!matchesIntegrationSecret(input.client_secret, app.secretHash))
        throw new IntegrationAppError('Invalid client credentials.', 401);
      const issued = tokens();
      if (input.grant_type === 'authorization_code') {
        const [code] = await tx
          .select()
          .from(integrationAppCode)
          .where(
            and(
              eq(integrationAppCode.clientId, app.clientId),
              eq(integrationAppCode.codeHash, hashIntegrationSecret(input.code)),
              gt(integrationAppCode.expiresAt, new Date()),
            ),
          )
          .for('update');
        if (!code || code.redirectUri !== input.redirect_uri)
          throw new IntegrationAppError('Invalid or expired authorization code.');
        await assertActiveUser(tx, code.userId);
        onAuthenticated?.(`${app.clientId}:${code.userId}`);
        await tx.delete(integrationAppCode).where(eq(integrationAppCode.codeHash, code.codeHash));
        const [connection] = await tx
          .insert(integrationAppConnection)
          .values({
            clientId: app.clientId,
            userId: code.userId,
            scopes: code.scopes,
            ...issued.stored,
          })
          .onConflictDoUpdate({
            target: [integrationAppConnection.clientId, integrationAppConnection.userId],
            set: { ...issued.stored, scopes: code.scopes, connectedAt: new Date() },
          })
          .returning({ id: integrationAppConnection.id });
        // Fresh consent starts a new token family. Older families must not be
        // able to revoke this newly approved connection through replay.
        await tx
          .delete(integrationAppRefreshUse)
          .where(eq(integrationAppRefreshUse.connectionId, connection!.id));
        return { ...issued.response, scope: code.scopes.join(' ') };
      }
      const [connection] = await tx
        .select()
        .from(integrationAppConnection)
        .where(
          and(
            eq(integrationAppConnection.clientId, app.clientId),
            eq(
              integrationAppConnection.refreshTokenHash,
              hashIntegrationSecret(input.refresh_token),
            ),
            gt(integrationAppConnection.refreshExpiresAt, new Date()),
          ),
        )
        .for('update');
      if (!connection) {
        const hash = hashIntegrationSecret(input.refresh_token);
        const [used] = await tx
          .select({ connectionId: integrationAppRefreshUse.connectionId })
          .from(integrationAppRefreshUse)
          .innerJoin(
            integrationAppConnection,
            eq(integrationAppConnection.id, integrationAppRefreshUse.connectionId),
          )
          .where(
            and(
              eq(integrationAppConnection.clientId, app.clientId),
              eq(integrationAppRefreshUse.tokenHash, hash),
              gt(integrationAppRefreshUse.expiresAt, new Date()),
            ),
          );
        if (used) {
          // Lock only the connection first, then recheck history. This also
          // handles fresh consent replacing the family while this request waits.
          await tx
            .select({ id: integrationAppConnection.id })
            .from(integrationAppConnection)
            .where(eq(integrationAppConnection.id, used.connectionId))
            .for('update');
          const [stillUsed] = await tx
            .select()
            .from(integrationAppRefreshUse)
            .where(
              and(
                eq(integrationAppRefreshUse.tokenHash, hash),
                eq(integrationAppRefreshUse.connectionId, used.connectionId),
                gt(integrationAppRefreshUse.expiresAt, new Date()),
              ),
            );
          if (stillUsed) {
            await tx
              .delete(integrationAppConnection)
              .where(eq(integrationAppConnection.id, used.connectionId));
            // Commit the revocation before returning the failure to the caller.
            return { reusedRefreshToken: true } as const;
          }
        }
        throw new IntegrationAppError('Invalid or expired refresh token.');
      }
      await assertActiveUser(tx, connection.userId);
      onAuthenticated?.(`${app.clientId}:${connection.userId}`);
      await tx
        .delete(integrationAppRefreshUse)
        .where(
          and(
            eq(integrationAppRefreshUse.connectionId, connection.id),
            lt(integrationAppRefreshUse.expiresAt, new Date()),
          ),
        );
      await tx.insert(integrationAppRefreshUse).values({
        tokenHash: connection.refreshTokenHash,
        connectionId: connection.id,
        expiresAt: connection.refreshExpiresAt,
      });
      await tx
        .update(integrationAppConnection)
        .set(issued.stored)
        .where(eq(integrationAppConnection.id, connection.id));
      return { ...issued.response, scope: connection.scopes.join(' ') };
    });
    if ('reusedRefreshToken' in result)
      throw new IntegrationAppError('Refresh token was reused. Reconnect the app.');
    return result;
  },
};
