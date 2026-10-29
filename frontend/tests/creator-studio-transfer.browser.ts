// Build first, then CREATOR_STUDIO_TRANSFER_TEST=1 bun frontend/tests/creator-studio-transfer.browser.ts
// Production bundle with local fixtures; no account, article or provider writes.
import { chromium, expect as baseExpect } from 'playwright/test';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { cardList } from '../../server/db/lists.ts';
import { creatorProfileSchema } from '../../shared/creators/contracts.ts';
import { emptyPostDocument } from '../../shared/posts/content.ts';

if (process.env.CREATOR_STUDIO_TRANSFER_TEST !== '1') throw new Error('Enable explicitly.');
const userId = 'studio-transfer-fixture';
const profiles = ['First Press', 'Second Press', 'Edited Press'].map((name, index) => ({
  ...creatorProfileSchema.parse({
    name,
    slug: name.toLowerCase().replaceAll(' ', '-'),
    languages: ['en'],
    specialties: [],
    links: [],
    bio: emptyPostDocument(),
  }),
  id: `10000000-0000-4000-8000-00000000000${index}`,
  ownerId: index === 2 ? 'another-owner' : userId,
  revision: 1,
  youtube: [],
}));
let remaining = 1;
const transfers: { creatorId: string; requestId: string }[] = [];
const dist = resolve(import.meta.dir, '../dist');
const server = Bun.serve({
  hostname: '127.0.0.1',
  port: 0,
  async fetch(request) {
    const path = new URL(request.url).pathname;
    const json = (data: unknown) => Response.json({ data });
    if (path === '/api/auth/get-session')
      return Response.json({
        user: {
          id: userId,
          name: 'Studio fixture',
          displayName: 'Studio fixture',
          email: 'studio@example.invalid',
          role: 'user',
          currency: 'USD',
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        },
        session: { id: userId, userId, expiresAt: '2099-01-01T00:00:00Z' },
      });
    if (path === '/api/creator-hub/mine') return json(profiles);
    if (path === '/api/creator-hub/personal/counts')
      return json({ total: remaining, drafts: remaining, published: 0 });
    if (path.endsWith('/transfer-articles')) {
      const creatorId = path.split('/').at(-2)!;
      transfers.push({ creatorId, ...(await request.json()) });
      remaining = 0;
      return json({ id: creatorId, slug: profiles.find(p => p.id === creatorId)!.slug, moved: 1 });
    }
    if (path.endsWith('/studio') || path === '/api/creator-hub/personal/articles')
      return json({ items: [], hasMore: false });
    if (path.endsWith('/youtube')) return json({ configured: false, channels: [] });
    if (path.startsWith('/api/card-list'))
      return json({
        official: { needsUpdate: true, lastUpdated: 'transfer-test', cards: cardList },
        preview: { needsUpdate: true, lastUpdated: 'transfer-test', cards: {} },
        karabast_unimplemented: {},
      });
    if (path === '/api/user-settings' || path === '/api/application-configuration')
      return Response.json({});
    if (path.startsWith('/api/')) return json([]);
    const file = resolve(dist, `.${path}`);
    return new Response(
      Bun.file(
        file.startsWith(dist + '/') && (await Bun.file(file).exists())
          ? file
          : resolve(dist, 'index.html'),
      ),
    );
  },
});
const browser = await chromium.launch();
const expect = baseExpect.configure({ timeout: 15_000 });
const errors: string[] = [];
const output = resolve(import.meta.dir, '../../.swubase/studio-transfer');
await mkdir(output, { recursive: true });
try {
  for (const theme of ['light', 'dark']) {
    remaining = 1;
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(value => {
      localStorage.setItem('cookie-consent', 'true');
      localStorage.setItem('vite-ui-theme', value);
    }, theme);
    try {
      await page.goto(`${server.url}creator-studio?creatorId=${profiles[0].id}`);
      const move = page.getByRole('button', { name: 'Move all personal articles', exact: true });
      const settings = page.getByRole('button', { name: 'Connections & editors', exact: true });
      const publisher = page.getByRole('combobox', { name: 'Publish as', exact: true });
      await expect(move).toHaveCount(1);
      // Switching keyed sibling panels must never leave orphaned transfer panels.
      for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: 1000 });
        for (let i = 0; i < 3; i++) {
          await settings.click();
          await expect(page.getByRole('heading', { name: 'Editors', exact: true })).toHaveCount(1);
          await expect(move).toHaveCount(1);
          await publisher.selectOption(profiles[(i + 1) % 2].id);
          await expect(page.getByRole('heading', { name: 'Editors', exact: true })).toHaveCount(0);
          await expect(move).toHaveCount(1);
          await settings.click();
          await settings.click();
          await expect(move).toHaveCount(1);
          await expect(
            page.getByRole('heading', { name: 'Your creations', exact: true }),
          ).toHaveCount(1);
        }
      }
      await publisher.selectOption('');
      await expect(move).toHaveCount(0);
      await publisher.selectOption(profiles[2].id);
      await expect(move).toHaveCount(0);
      await publisher.selectOption(profiles[0].id);
      await expect(move).toHaveCount(1);
      await expect(
        page.getByRole('heading', {
          name: 'Bring your personal articles to First Press',
          exact: true,
        }),
      ).toHaveCount(1);
      await page.screenshot({ path: resolve(output, `studio-${theme}.png`) });
      const before = transfers.length;
      await move.click();
      await expect(move).toHaveCount(0);
      expect(transfers).toHaveLength(before + 1);
      expect(transfers.at(-1)?.creatorId).toBe(profiles[0].id);
    } catch (error) {
      await page.screenshot({ path: resolve(output, 'failure.png') });
      throw error;
    } finally {
      await page.close();
    }
  }
  expect(errors).toEqual([]);
  console.log(
    'Studio transfer panel remains unique through connection toggles and profile switches on desktop/mobile in both themes; one transfer removes the prompt.',
  );
} finally {
  await browser.close();
  server.stop(true);
}
