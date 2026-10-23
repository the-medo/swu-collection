import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { bodyLimit } from 'hono/body-limit';
import { createMcpProtectedRequestHandler } from '@better-auth/mcp';
import { createInsufficientScopeError } from 'better-auth/oauth2';
import { createMcpHandler, McpServer } from '@modelcontextprotocol/server';
import { MCP_DEFAULT_SCOPES, MCP_RESOURCE_SCOPES, MCP_SCOPE } from '../shared/mcp/config.ts';
import type { McpConfig } from './config.ts';
import type { McpRepository } from './database.ts';
import { createToolRegistry } from './tools/registry.ts';
import type { ToolRunner } from './tools/definition.ts';
import { toolException, toolFailure, toolSuccess } from './tools/results.ts';

export function createMcpApp(
  config: Pick<McpConfig, 'resource' | 'issuer' | 'allowedOrigins'>,
  repository: McpRepository,
) {
  const registry = createToolRegistry(repository);
  const app = new Hono();
  app.onError((_error, c) => {
    // Database errors can contain bound credentials or request data. Keep logs fixed.
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
  app.use('/mcp', bodyLimit({ maxSize: 14_000_000 }));
  app.get('/health', async c => {
    await repository.health();
    return c.json({ status: 'ok' });
  });
  const metadata = {
    resource: config.resource,
    authorization_servers: [config.issuer],
    scopes_supported: [...MCP_RESOURCE_SCOPES],
    bearer_methods_supported: ['header'],
    resource_name: 'SWUBASE MCP',
  };
  app.get('/.well-known/oauth-protected-resource/mcp', c => c.json(metadata));
  app.get('/.well-known/oauth-protected-resource', c => c.json(metadata));
  const handler = createMcpHandler(
    ({ authInfo }) => {
      const userId = authInfo?.extra?.userId;
      const scopes = authInfo?.extra?.scopes;
      if (typeof userId !== 'string' || !authInfo || !Array.isArray(scopes))
        throw new Error('Missing verified identity.');
      const grantedScopes = new Set(
        scopes.filter((scope): scope is string => typeof scope === 'string'),
      );
      const identity = { userId, clientId: authInfo.clientId };
      const websiteOrigin = new URL(config.issuer).origin;
      const server = new McpServer({ name: 'swubase', version: '0.3.0' });

      const runTool: ToolRunner = async (name, action) => {
        const tool = registry.get(name);
        if (!tool) return toolFailure('Unknown tool.', 404);
        const started = performance.now();
        try {
          const id = await repository.admit(identity, tool.name);
          if (!id)
            return toolFailure(
              'Your tool-call rate limit has been reached. Retry in one minute.',
              429,
              60,
            );
          let outcome: 'success' | 'error' = 'error';
          let count = 0;
          try {
            const result = await action();
            const response = toolSuccess(result.data);
            count = result.count;
            outcome = 'success';
            return response;
          } finally {
            // Fail closed if recording fails; a crash leaves the admitted 'started' row.
            await repository.finish(id, outcome, count, Math.round(performance.now() - started));
          }
        } catch (error) {
          return toolException(error);
        }
      };
      const context = { actor: { ...identity, scopes: [...grantedScopes] }, websiteOrigin };
      for (const tool of registry.tools) tool.register(server, context, runTool);
      return server;
    },
    { legacy: 'stateless', onerror: () => console.error('[mcp] Protocol request failed.') },
  );

  const protectedHandler = createMcpProtectedRequestHandler(
    {
      issuer: config.issuer,
      audience: config.resource,
      jwksUrl: config.issuer + '/jwks',
      requiredScopes: [MCP_SCOPE],
      challengeScopes: MCP_DEFAULT_SCOPES,
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
              'WWW-Authenticate':
                'Bearer resource_metadata="' +
                new URL(config.resource).origin +
                '/.well-known/oauth-protected-resource/mcp", scope="' +
                MCP_DEFAULT_SCOPES.join(' ') +
                '", error="invalid_token"',
            },
          },
        );
      if (request.method === 'POST') {
        const raw = await request.clone().text();
        let message;
        try {
          message = JSON.parse(raw);
        } catch {
          message = null;
        }
        const name = message?.method === 'tools/call' ? message?.params?.name : undefined;
        const tool = registry.get(name);
        if (Buffer.byteLength(raw) > (tool?.maxInputBytes ?? 350_000))
          return Response.json({ message: 'Tool input is too large.' }, { status: 413 });
        const required = tool?.requiredScopes(message?.params?.arguments ?? {}) ?? [];
        if (required.some(scope => !identity.scopes.includes(scope)))
          throw createInsufficientScopeError([
            ...new Set([...MCP_DEFAULT_SCOPES, ...identity.scopes, ...required]),
          ]);
      }
      return handler.fetch(request, {
        authInfo: {
          token: request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '',
          clientId: identity.clientId,
          expiresAt: claims.exp,
          scopes: identity.scopes,
          extra: { userId: identity.userId, scopes: identity.scopes },
        },
      });
    },
  );
  app.all('/mcp', c => protectedHandler(c.req.raw));
  return app;
}
