// MCP_ARTICLE_BROWSER_TEST=1 bun --env-file=.env --env-file=.env.worktree frontend/tests/mcp-articles.browser.ts
import { chromium, expect as baseExpect } from 'playwright/test';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { getCookies } from 'better-auth/cookies';
import { serializeSignedCookie } from 'better-call';
import { mkdir } from 'node:fs/promises';
import { createArticleRepository } from '../../mcp/articles/repository.ts';
import { normalizeBody } from '../../mcp/articles/content.ts';
import { MCP_RESOURCE_SCOPES } from '../../shared/mcp/config.ts';

const database = new URL(process.env.DATABASE_URL!);
const origin = process.env.BETTER_AUTH_URL!;
if (
  process.env.MCP_ARTICLE_BROWSER_TEST !== '1' ||
  database.hostname !== '127.0.0.1' ||
  !database.pathname.startsWith('/swubase_')
)
  throw new Error('Enable only against an isolated worktree database.');
if (
  !['localhost', '127.0.0.1'].includes(new URL(origin).hostname) &&
  !new URL(origin).hostname.endsWith('.ts.net')
)
  throw new Error('Expected a development origin.');
const sql = postgres(database.href, { max: 2 });
const articles = createArticleRepository(drizzle({ client: sql }));
const userId = `mcp-article-browser-${crypto.randomUUID()}`,
  token = crypto.randomUUID();
const actor = { userId, clientId: crypto.randomUUID(), scopes: [...MCP_RESOURCE_SCOPES] };
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const expect = baseExpect.configure({ timeout: 20000 });
const errors: string[] = [];
page.on('pageerror', error => errors.push(error.message));
await page.addLocatorHandler(page.getByRole('button', { name: 'Dismiss', exact: true }), () =>
  page.getByRole('button', { name: 'Dismiss', exact: true }).click(),
);
try {
  await sql`INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at, display_name, currency)
    VALUES (${userId}, 'MCP article fixture', ${userId + '@invalid.local'}, false, now(), now(), 'MCP article fixture', 'USD')`;
  await sql`INSERT INTO session (id, token, expires_at, user_id, created_at, updated_at)
    VALUES (${crypto.randomUUID()}, ${token}, now() + interval '1 hour', ${userId}, now(), now())`;
  const card = { cardId: 'echo-base', variantId: '', name: 'Echo Base' };
  const widgets = [
    { kind: 'card-image', card, size: 'large' },
    { kind: 'card-group', cards: [card], size: 'small', text: 'Bases' },
    { kind: 'decklist', deck: { deckId: crypto.randomUUID() } },
    { kind: 'album', albumId: crypto.randomUUID() },
    { kind: 'pool', poolId: crypto.randomUUID() },
    {
      kind: 'meta-analysis',
      scope: 'tournament',
      id: crypto.randomUUID(),
      settings: { metaInfo: 'leadersAndBase', metaPart: 'top8' },
    },
    {
      kind: 'matchup',
      title: 'Matchup plan',
      leftBase: 'echo-base',
      notes: {
        version: 1,
        blocks: [{ type: 'paragraph', content: [{ type: 'text', text: 'Keep removal.' }] }],
      },
      footer: 'Sideboard',
    },
    { kind: 'callout', tone: 'warning', title: 'Remember', text: 'Count resources.' },
  ];
  const body = normalizeBody({
    version: 1,
    blocks: [
      { id: 'intro', type: 'paragraph', content: [{ type: 'text', text: 'Created through MCP.' }] },
      ...widgets.map(widget => ({ type: 'swuBlock', widget })),
      {
        type: 'paragraph',
        content: [
          { type: 'swuInline', widget: { kind: 'card-link', card } },
          {
            type: 'swuInline',
            widget: { kind: 'mention', user: { id: userId, displayName: 'MCP article fixture' } },
          },
        ],
      },
    ],
  });
  const created = await articles.create(actor, {
    requestId: crypto.randomUUID(),
    creatorId: null,
    fields: { title: 'MCP browser article', body },
  });
  const initial = await articles.get(actor, {
    articleId: created.id,
    view: 'draft',
    format: 'native',
  });
  await articles.publish(actor, {
    articleId: created.id,
    expectedRevision: created.revision,
    expectedOwnershipRevision: created.ownershipRevision,
    requestId: crypto.randomUUID(),
    unpublish: false,
  });
  const cookieName = getCookies({
    baseURL: origin,
    advanced: { cookiePrefix: process.env.BETTER_AUTH_COOKIE_PREFIX },
  }).sessionToken.name;
  const signed = (
    await serializeSignedCookie(cookieName, token, process.env.BETTER_AUTH_SECRET!)
  ).split(';')[0]!;
  await context.addCookies([
    {
      name: cookieName,
      value: signed.slice(signed.indexOf('=') + 1),
      url: origin,
      httpOnly: true,
      secure: origin.startsWith('https:'),
      sameSite: 'Lax',
    },
  ]);
  await page.goto(`${origin}/creator-studio?creationId=${created.id}`);
  await expect(page.getByRole('textbox', { name: 'Title', exact: true })).toHaveValue(
    'MCP browser article',
  );
  await expect(page.locator('[contenteditable=true]').first()).toBeVisible();
  await expect(page.getByText('Count resources.', { exact: true })).toBeVisible();
  await page.getByRole('textbox', { name: 'Title', exact: true }).fill('Edited in Creator Studio');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect
    .poll(async () => {
      const draft = await articles.get(actor, {
        articleId: created.id,
        view: 'draft',
        format: 'native',
      });
      return 'document' in draft ? draft.document.title : null;
    })
    .toBe('Edited in Creator Studio');
  const draft = await articles.get(actor, {
    articleId: created.id,
    view: 'draft',
    format: 'native',
  });
  expect('document' in draft && draft.document.body).toEqual(
    'document' in initial && initial.document.body,
  );
  const published = await articles.get(actor, {
    articleId: created.id,
    view: 'published',
    format: 'native',
  });
  expect('document' in published && published.document.title).toBe('MCP browser article');
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  await expect(page.getByRole('article', { name: 'Article preview' })).toContainText(
    'Edited in Creator Studio',
  );
  await expect(page.getByRole('article', { name: 'Article preview' })).toContainText(
    'Count resources.',
  );
  await expect(page.getByText('Loading article...', { exact: true })).toHaveCount(0);
  await mkdir('.swubase/mcp-article-screenshots', { recursive: true });
  await page.screenshot({ path: '.swubase/mcp-article-screenshots/preview.png', fullPage: true });
  expect(errors).toEqual([]);
  console.log(
    'MCP draft with all ten widgets rendered, browser edit round-tripped, published snapshot preserved.',
  );
} finally {
  await context.close();
  await browser.close();
  await sql`DELETE FROM "user" WHERE id = ${userId}`;
  await sql.end();
}
