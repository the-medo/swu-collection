import { expect, test } from 'bun:test';
import { z } from 'zod';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { createMcpRepository } from '../database.ts';
import { createToolRegistry } from './registry.ts';
import {
  defineTool,
  readOnly,
  type ToolContext,
  type ToolOutput,
  type ToolRunner,
} from './definition.ts';
import { toolException, toolSuccess } from './results.ts';

// Construct real definitions without connecting to a database. Denied calls must
// return before reaching any service (which would try this unreachable address).
const database = drizzle(postgres('postgres://unused:unused@127.0.0.1:1/unused'));
const registry = createToolRegistry(createMcpRepository(database, 'https://mcp.example/mcp', 60));
const context: ToolContext = {
  actor: {
    userId: 'verified-user',
    clientId: 'verified-client',
    scopes: ['cards:read', 'articles:read'],
  },
  websiteOrigin: 'https://swubase.example',
};
const run: ToolRunner = async (_name, work) => {
  try {
    return toolSuccess((await work()).data);
  } catch (error) {
    return toolException(error);
  }
};

test('dynamic permission challenges use validated defaults and match execution checks', async () => {
  const prepare = registry.get('prepare_article_template')!;
  const deckId = crypto.randomUUID();
  for (const [args, scopes] of [
    [{ template: 'tournament-report' }, ['articles:read', 'melee:read']],
    [{ template: 'deck-guide', deckId }, ['articles:read', 'decks:read']],
    [{ template: 'tournament-report', deckId }, ['articles:read', 'melee:read', 'decks:read']],
  ] as const) {
    expect(prepare.requiredScopes(args)).toEqual([...scopes]);
    let admitted = false;
    const result = await prepare.invoke(args, context, async (name, work) => {
      admitted = true;
      return run(name, work);
    });
    expect(result).toMatchObject({
      isError: true,
      structuredContent: { code: 'forbidden', status: 403, retryable: false },
    });
    expect(admitted).toBe(false);
  }
  expect(prepare.requiredScopes({ template: 'tournament-report', blank: true, deckId })).toEqual([
    'articles:read',
  ]);
  const blank = await prepare.invoke({ template: 'tournament-report', blank: true }, context, run);
  expect(blank).not.toHaveProperty('isError');
  expect(blank.structuredContent).toHaveProperty('body');

  const assets = registry.get('search_article_assets')!;
  expect(assets.requiredScopes({ kind: 'deck' })).toEqual(['articles:read']);
  expect(assets.requiredScopes({ kind: 'deck', includeMine: true })).toEqual([
    'articles:read',
    'decks:read',
  ]);
  expect(assets.requiredScopes({ kind: 'card', includeMine: true })).toEqual(['articles:read']);
  expect(await assets.invoke({ kind: 'deck', includeMine: true }, context, run)).toMatchObject({
    isError: true,
    structuredContent: { code: 'forbidden' },
  });
  expect(registry.get('publish_article')!.requiredScopes({})).toEqual([
    'articles:read',
    'articles:publish',
  ]);
  expect(registry.get('constructor')).toBeUndefined();
  expect(registry.get({})).toBeUndefined();
});

test('invalid input cannot bypass dynamic scopes or execute a service', async () => {
  for (const args of [
    { template: 'deck-guide', deckId: 'invalid' },
    { template: 'tournament-report', blank: 'true' },
    { template: 'tournament-report', blank: true, userId: 'spoofed' },
  ]) {
    const result = await registry.get('prepare_article_template')!.invoke(args, context, run);
    expect(result).toMatchObject({
      isError: true,
      structuredContent: { code: 'validation_error', status: 400, retryable: false },
    });
  }
});

test('typed results preserve fields and metering is explicit rather than inferred from array names', async () => {
  const tool = defineTool({
    name: 'typed-result-test',
    description: 'Exercise the tool boundary.',
    inputSchema: z.object({ take: z.number().int().default(2) }),
    scopes: ['cards:read'],
    annotations: readOnly,
    execute: input => ({
      articles: ['a'],
      files: ['a', 'b'],
      chosen: input.take,
      editorPath: '/leave-as-data',
      published: true,
      id: 'not-an-article',
    }),
    count: data => data.chosen,
  });
  let resultCount = 0;
  const result = await tool.invoke({}, context, async (_name, work) => {
    const { data, count } = await work();
    resultCount = count;
    return toolSuccess(data);
  });
  expect(resultCount).toBe(2);
  if (result.isError) throw new Error(result.structuredContent.message);
  const typedCount: number = result.structuredContent.chosen;
  expect(typedCount).toBe(2);
  expect(result.structuredContent).toEqual({
    articles: ['a'],
    files: ['a', 'b'],
    chosen: 2,
    editorPath: '/leave-as-data',
    published: true,
    id: 'not-an-article',
  });
  expect(JSON.parse(result.content[0]!.text)).toEqual(result.structuredContent);
  // Checked by mcp:check: neither service results nor count callbacks can silently
  // become Record<string, unknown> again.
  const typed: ToolOutput<typeof tool> = await tool.execute({ take: 2 }, context);
  const chosen: number = typed.chosen;
  expect(chosen).toBe(2);
  // @ts-expect-error This field is not part of the inferred result contract.
  void typed.missingField;
});
