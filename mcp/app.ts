import { z } from 'zod';
import { CreatorError } from '../server/lib/creators/errors.ts';
import { MeleeConnectionError } from '../server/lib/melee/profile.ts';
import { UserFileError } from '../server/lib/user-files/errors.ts';
import { ProfanityError } from '../server/lib/moderation/content.ts';
import { articleScopes, registerArticleTools } from './articles/tools.ts';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { bodyLimit } from 'hono/body-limit';
import { createMcpProtectedRequestHandler } from '@better-auth/mcp';
import { createInsufficientScopeError } from 'better-auth/oauth2';
import { createMcpHandler, McpServer } from '@modelcontextprotocol/server';
import {
  MCP_DECK_SCOPE,
  MCP_DEFAULT_SCOPES,
  MCP_RESOURCE_SCOPES,
  MCP_SCOPE,
} from '../shared/mcp/config.ts';
import type { McpConfig } from './config.ts';
import type { McpRepository, McpToolName } from './database.ts';
import { cardLookupInput, cardSearchInput, getCards, searchCards } from './cards.ts';
import { deckDetails, deckGetInput, deckListInput, deckSummary } from './decks.ts';

const deckTools = new Set<McpToolName>(['list_my_decks', 'get_deck']);
const annotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};
const toolError = (message: string) => ({
  isError: true,
  content: [{ type: 'text' as const, text: message }],
});
class ToolFailure extends Error {}

export function createMcpApp(
  config: Pick<McpConfig, 'resource' | 'issuer' | 'allowedOrigins'>,
  repository: McpRepository,
) {
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

      async function runTool(
        tool: McpToolName,
        action: () =>
          | { data: Record<string, unknown>; count: number }
          | Promise<{ data: Record<string, unknown>; count: number }>,
      ) {
        if (articleScopes(tool).some(scope => !grantedScopes.has(scope)))
          return toolError(
            'Reconnect to SWUBASE and approve the permissions required by this tool.',
          );
        if (deckTools.has(tool) && !grantedScopes.has(MCP_DECK_SCOPE))
          return toolError('Reconnect to SWUBASE and approve decks:read access.');
        const started = performance.now();
        try {
          const id = await repository.admit(identity, tool);
          if (!id)
            return toolError('Your tool-call rate limit has been reached. Retry in one minute.');
          let outcome: 'success' | 'error' = 'error';
          let count = 0;
          try {
            const result = await action();
            if (typeof result.data.editorPath === 'string')
              result.data.editorUrl = websiteOrigin + result.data.editorPath;
            if (
              (result.data.published === true || result.data.publishedAt) &&
              typeof result.data.id === 'string'
            )
              result.data.publicUrl = websiteOrigin + '/content/' + result.data.id;
            if (Buffer.byteLength(JSON.stringify(result.data)) > 700_000)
              throw new ToolFailure(
                'Result is too large. Use smaller pages, selected template sections, or outline format.',
              );
            count = result.count;
            outcome = 'success';
            return {
              content: [{ type: 'text' as const, text: JSON.stringify(result.data) }],
              structuredContent: result.data,
            };
          } finally {
            // Fail closed if recording fails; a crash leaves the admitted 'started' row.
            await repository.finish(id, outcome, count, Math.round(performance.now() - started));
          }
        } catch (error) {
          if (error instanceof ToolFailure) return toolError(error.message);
          if (
            error instanceof CreatorError ||
            error instanceof MeleeConnectionError ||
            error instanceof UserFileError ||
            error instanceof ProfanityError
          )
            return {
              ...toolError(error.message),
              structuredContent: {
                code:
                  error.status === 409
                    ? 'conflict'
                    : error.status === 403
                      ? 'forbidden'
                      : 'invalid_request',
                status: error.status,
                message: error.message,
              },
            };
          if (error instanceof z.ZodError) {
            const issues = error.issues
              .slice(0, 10)
              .map(issue => ({ path: issue.path.join('.'), message: issue.message }));
            return {
              ...toolError(
                'Invalid article input: ' +
                  issues.map(issue => `${issue.path}: ${issue.message}`).join('; '),
              ),
              structuredContent: { code: 'validation_error', issues },
            };
          }
          console.error('[mcp] Tool execution failed.');
          return toolError('The tool is temporarily unavailable. Please retry later.');
        }
      }

      server.registerTool(
        'search_cards',
        {
          description:
            'Search official Star Wars Unlimited cards by name/ID or aspect, printed keyword, trait, type, arena, set, numeric stats and rules text. Supply a query or filters. Results include full card text and SWUBASE links. Preview cards are excluded. Pagination is bounded; this does not check deck legality.',
          inputSchema: cardSearchInput,
          annotations,
        },
        input =>
          runTool('search_cards', () => {
            const data = searchCards(input, websiteOrigin);
            return { data, count: data.cards.length };
          }),
      );
      server.registerTool(
        'get_cards',
        {
          description:
            'Read full official card details for up to 25 exact logical SWUBASE card IDs. Preserve requested order, deduplicate IDs and report unavailable IDs in missingCardIds. Use this to inspect candidates or deck references; preview cards are excluded.',
          inputSchema: cardLookupInput,
          annotations,
        },
        input =>
          runTool('get_cards', () => {
            const data = getCards(input, websiteOrigin);
            return { data, count: data.cards.length };
          }),
      );
      server.registerTool(
        'list_my_decks',
        {
          description:
            'Find the authenticated user’s saved decks, including private decks. Filter by name, exact leader/base card ID or format ID. Returns bounded summaries sorted by latest update, deck IDs and links. Requires decks:read consent.',
          inputSchema: deckListInput,
          annotations,
        },
        input =>
          runTool('list_my_decks', async () => {
            const result = await repository.listDecks(userId, input);
            const data = {
              total: result.total,
              offset: input.offset,
              limit: input.limit,
              decks: result.decks.map(row => deckSummary(row, websiteOrigin)),
            };
            return { data, count: data.decks.length };
          }),
      );
      server.registerTool(
        'get_deck',
        {
          description:
            'Read a deck by UUID from list_my_decks or a SWUBASE deck URL. Uses SWUBASE access rules: owned private decks, public/unlisted decks, and decks shared through folders. Returns leader/base, format, description and quantities in separate main, sideboard and maybeboard lists. Card-pool locations use SWUBASE’s board mapping; unknown pool IDs remain unclassified. Unknown/preview card IDs are explicitly reported; use get_cards for full official card text. Requires decks:read consent.',
          inputSchema: deckGetInput,
          annotations,
        },
        input =>
          runTool('get_deck', async () => {
            const result = await repository.getDeck(userId, input.deckId);
            if (!result) throw new ToolFailure('Deck not found or unavailable to your account.');
            if ('tooLarge' in result)
              throw new ToolFailure('This deck exceeds the supported content limit.');
            return { data: deckDetails(result, websiteOrigin), count: 1 };
          }),
      );
      if (repository.articleServices)
        registerArticleTools(
          server,
          repository.articleServices,
          { ...identity, scopes: [...grantedScopes] },
          runTool,
        );
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
        if (Buffer.byteLength(raw) > (name === 'upload_article_image' ? 14_000_000 : 350_000))
          return Response.json({ message: 'Tool input is too large.' }, { status: 413 });
        const required = deckTools.has(name)
          ? [MCP_DECK_SCOPE]
          : articleScopes(name, message?.params?.arguments);
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
