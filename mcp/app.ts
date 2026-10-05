import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { bodyLimit } from 'hono/body-limit';
import { createMcpProtectedRequestHandler } from '@better-auth/mcp';
import { createMcpHandler, McpServer } from '@modelcontextprotocol/server';
import { MCP_AUTH_SCOPES, MCP_SCOPE } from '../shared/mcp/config.ts';
import type { McpConfig } from './config.ts';
import type { McpRepository } from './database.ts';
import { cardSearchInput, searchCards } from './cards.ts';

export function createMcpApp(
  config: Pick<McpConfig, 'resource' | 'issuer' | 'allowedOrigins'>,
  repository: McpRepository,
) {
  const app = new Hono();
  app.onError((_error, c) => {
    // SQL errors can contain bound credentials or request data. Keep logs fixed.
    console.error('[mcp] Request failed.');
    return c.json({ message: 'MCP is temporarily unavailable.' }, 503);
  });
  app.use('*', async (c, next) => {
    c.header('Cache-Control', 'no-store');
    const origin = c.req.header('origin');
    if (origin && !config.allowedOrigins.has(origin))
      return c.json({ message: 'Origin is not allowed.' }, 403);
    return next();
  });
  app.use(
    '*',
    cors({
      origin: origin => (config.allowedOrigins.has(origin) ? origin : undefined),
      allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Authorization', 'Content-Type', 'MCP-Protocol-Version', 'MCP-Session-Id'],
      exposeHeaders: ['WWW-Authenticate', 'MCP-Protocol-Version'],
      maxAge: 600,
    }),
  );
  app.use('/mcp', bodyLimit({ maxSize: 16_384 }));
  app.get('/health', async c => {
    await repository.health();
    return c.json({ status: 'ok' });
  });
  const metadata = {
    resource: config.resource,
    authorization_servers: [config.issuer],
    scopes_supported: [MCP_SCOPE],
    bearer_methods_supported: ['header'],
    resource_name: 'SWUBASE MCP',
  };
  app.get('/.well-known/oauth-protected-resource/mcp', c => c.json(metadata));
  app.get('/.well-known/oauth-protected-resource', c => c.json(metadata));
  const handler = createMcpHandler(
    ({ authInfo }) => {
      const userId = authInfo?.extra?.userId;
      if (typeof userId !== 'string' || !authInfo) throw new Error('Missing verified identity.');
      const identity = { userId, clientId: authInfo.clientId };
      const server = new McpServer({ name: 'swubase', version: '0.1.0' });
      server.registerTool(
        'search_cards',
        {
          description:
            'Search official Star Wars Unlimited cards by name or SWUBASE card ID. Results include card text and a SWUBASE link. Preview cards are excluded. Use offset to page through results.',
          inputSchema: cardSearchInput,
          annotations: {
            readOnlyHint: true,
            destructiveHint: false,
            idempotentHint: true,
            openWorldHint: false,
          },
        },
        async input => {
          const started = performance.now();
          try {
            const id = await repository.admit(identity);
            if (!id)
              return {
                isError: true,
                content: [
                  {
                    type: 'text',
                    text: 'Your card-search rate limit has been reached. Retry in one minute.',
                  },
                ],
              };
            let outcome: 'success' | 'error' = 'error';
            let count = 0;
            try {
              const result = searchCards(input, new URL(config.issuer).origin);
              count = result.cards.length;
              outcome = 'success';
              return {
                content: [{ type: 'text', text: JSON.stringify(result) }],
                structuredContent: result,
              };
            } finally {
              // Fail closed if usage cannot be recorded. A crash leaves a 'started'
              // row, preserving the admitted call count instead of silently losing it.
              await repository.finish(id, outcome, count, Math.round(performance.now() - started));
            }
          } catch {
            // The SDK otherwise converts thrown exception messages into tool output.
            console.error('[mcp] Tool execution failed.');
            return {
              isError: true,
              content: [
                {
                  type: 'text',
                  text: 'Card search is temporarily unavailable. Please retry later.',
                },
              ],
            };
          }
        },
      );
      return server;
    },
    { legacy: 'stateless', onerror: () => console.error('[mcp] Protocol request failed.') },
  );
  const protectedHandler = createMcpProtectedRequestHandler(
    {
      issuer: config.issuer,
      audience: config.resource,
      jwksUrl: `${config.issuer}/jwks`,
      requiredScopes: [MCP_SCOPE],
      challengeScopes: MCP_AUTH_SCOPES,
    },
    async (request, claims) => {
      const identity = await repository.authorize(claims);
      if (identity === 'restricted')
        return Response.json({ message: 'This account is suspended or banned.' }, { status: 403 });
      if (identity === 'invalid')
        return Response.json(
          { message: 'Reconnect your agent to SWUBASE.' },
          {
            status: 401,
            headers: {
              'WWW-Authenticate': `Bearer resource_metadata="${new URL(config.resource).origin}/.well-known/oauth-protected-resource/mcp", scope="${MCP_AUTH_SCOPES.join(' ')}", error="invalid_token"`,
            },
          },
        );
      return handler.fetch(request, {
        authInfo: {
          token: request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '',
          clientId: identity.clientId,
          scopes: typeof claims.scope === 'string' ? claims.scope.split(' ') : [],
          expiresAt: claims.exp,
          extra: { userId: identity.userId },
        },
      });
    },
  );
  app.all('/mcp', c => protectedHandler(c.req.raw));
  return app;
}
