import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { verifyOAuthQueryParams } from '@better-auth/oauth-provider';
import { eq } from 'drizzle-orm';
import { auth, mcpResourceUrl, type AuthExtension } from '../auth/auth.ts';
import { db } from '../db/index.ts';
import { oauthClient } from '../db/schema/auth-schema.ts';
import { mcpAuthorizationQuery } from '../../shared/mcp/authorization.ts';
import { MCP_SCOPE } from '../../shared/mcp/config.ts';

export const mcpRoute = new Hono<AuthExtension>().get(
  '/authorization',
  zValidator('query', mcpAuthorizationQuery),
  async c => {
    c.header('Cache-Control', 'no-store');
    if (!mcpResourceUrl) return c.json({ message: 'MCP is not enabled.' }, 404);
    if (!c.get('user')) return c.json({ message: 'Sign in to continue.' }, 401);
    const { oauth_query } = c.req.valid('query');
    if (!(await verifyOAuthQueryParams(oauth_query, (await auth.$context).secret))) {
      return c.json(
        {
          message:
            'This authorization request is invalid or has expired. Reconnect from your agent.',
        },
        400,
      );
    }
    const query = new URLSearchParams(oauth_query);
    const scopes = query.get('scope')?.split(' ').filter(Boolean) ?? [];
    const resources = query.getAll('resource');
    if (
      !scopes.includes(MCP_SCOPE) ||
      scopes.some(scope => ![MCP_SCOPE, 'offline_access'].includes(scope)) ||
      resources.length !== 1 ||
      resources[0] !== mcpResourceUrl
    )
      return c.json({ message: 'Unsupported MCP access request.' }, 400);
    const [client] = await db
      .select({
        clientId: oauthClient.clientId,
        name: oauthClient.name,
        disabled: oauthClient.disabled,
      })
      .from(oauthClient)
      .where(eq(oauthClient.clientId, query.get('client_id') ?? ''))
      .limit(1);
    // Registration and the signed query are authoritative; query-string client
    // names never determine what is displayed or approved.
    // The provider validates redirects (including native loopback port rules)
    // before signing and again when consent completes.
    if (!client || client.disabled) {
      return c.json({ message: 'This client is unavailable.' }, 400);
    }
    const redirect = new URL(query.get('redirect_uri')!);
    const loopback = /^(localhost|127\.(?:\d+\.){2}\d+|\[::1\])$/.test(redirect.hostname);
    const redirectTarget =
      loopback && ['https:', 'http:'].includes(redirect.protocol)
        ? `Local application (${redirect.hostname || redirect.protocol})`
        : ['https:', 'http:'].includes(redirect.protocol)
          ? redirect.origin
          : `${redirect.protocol}${redirect.host ? `//${redirect.host}` : ''}`;
    return c.json({
      data: {
        clientId: client.clientId,
        clientName: client.name ?? client.clientId,
        redirectTarget,
        scopes,
      },
    });
  },
);
