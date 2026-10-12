// TODAY_HOME_BROWSER_TEST=1 bun frontend/tests/today-home.browser.ts
// Build first. Uses a temporary loopback server and explicit API fixtures, no database.
import { chromium, expect as baseExpect } from 'playwright/test';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { cardList } from '../../server/db/lists.ts';
import { getCardPoolMap } from '../../server/lib/card-pools/card-pool-map-by-set.ts';
import type { DiscussionComment } from '../../shared/types/discussions.ts';
import { SwuSet } from '../../types/enums.ts';
import { getDailySealedDate, type DailySealedResponse } from '../../shared/types/dailySealed.ts';

if (process.env.TODAY_HOME_BROWSER_TEST !== '1')
  throw new Error('Enable TODAY_HOME_BROWSER_TEST=1.');
const dist = resolve(import.meta.dir, '../dist');
if (!(await Bun.file(resolve(dist, 'index.html')).exists()))
  throw new Error('Build the frontend first.');

const leaders = getCardPoolMap(SwuSet.HMW).leaders.Common.slice(0, 6);
const today = getDailySealedDate();
const dayBefore = (days: number) =>
  getDailySealedDate(new Date(Date.parse(`${today}T00:00:00Z`) - days * 86_400_000));
const baseId = Object.values(cardList).find(
  card => card?.type === 'Base' && card.rarity === 'Common' && card.set === SwuSet.HMW,
)!.cardId;
const data: DailySealedResponse = {
  date: today,
  today,
  nextRefreshAt: `${dayBefore(-1)}T00:00:00.000Z`,
  availableDates: Array.from({ length: 6 }, (_, i) => dayBefore(i)),
  pool: {
    id: '11111111-1111-4111-8111-111111111111',
    date: today,
    name: `Daily sealed · ${today}`,
    set: SwuSet.HMW,
    boosterCount: 8,
    cardCount: 120,
    leaders: leaders.map((cardId, index) => ({ cardId, copies: index < 2 ? 2 : 1 })),
    publicDeckCount: 6,
    builderCount: 4,
    decks: [
      'The patient approach',
      'Ground control',
      'A different angle',
      'Space to breathe',
      'Small units, big plans',
      'Pressure from turn one',
    ].map((name, index) => ({
      id: `22222222-2222-4222-8222-22222222222${index}`,
      name,
      leaderCardId: leaders[index]!,
      baseCardId: baseId,
      author: {
        id: `example-${index % 4}`,
        displayName: ['Mira', 'Jules', 'Rin', 'Theo'][index % 4]!,
      },
    })),
  },
};

let state: 'ready' | 'empty' | 'no-decks' | 'error' | 'fallback' = 'ready';
const dailyRequests: (string | null)[] = [];
const createdDecks: { poolId: string; visibility: string }[] = [];
function dailyFixture(date: string): DailySealedResponse {
  if (date === today) return data;
  const available = data.availableDates.includes(date);
  return {
    ...data,
    date,
    pool: available
      ? {
          ...data.pool!,
          date,
          id: `11111111-1111-4111-8111-${date.replaceAll('-', '').padStart(12, '0')}`,
          name: `Daily sealed · ${date}`,
          leaders: data.pool!.leaders.slice(0, 4),
          decks: data.pool!.decks.map(deck => ({ ...deck, name: `${date} · ${deck.name}` })),
        }
      : null,
  };
}
const ownerId = 'today-owner';
let signedIn = true;
let deckState: 'ready' | 'empty' | 'error' = 'ready';
let communityState: 'ready' | 'empty' | 'error' = 'ready';
let poolVisibility: 'public' | 'unlisted' | 'private' = 'public';
let poolDetailDecks = false;
let deckTableFixture = false;
const poolComments = new Map<string, DiscussionComment[]>();
const discussionRequests: string[] = [];
let personalState: 'ready' | 'empty' | 'error' = 'empty';
const personalRequests: URLSearchParams[] = [];
let applicationMode = 'snapshot';
const deckRequests: URLSearchParams[] = [];
const communityRequests: URLSearchParams[] = [];
const recentDecks = [
  ['Han — new set experiments', 4, 1, ownerId, 0],
  ['Sabine — tempo rebuild', 2, 1, ownerId, 2],
  [
    'Vader — weekend testing with a longer deck name for the next Planetary Qualifier',
    6,
    1,
    ownerId,
    1,
  ],
  ['Older Premier draft', 48, 1, ownerId, 0],
  ['Recent sealed deck', 0.1, 3, ownerId, 1],
  ['Recent Eternal deck', 0.2, 6, ownerId, 1],
  ['Someone else’s Premier deck', 0.3, 1, 'someone-else', 1],
].map(([name, hours, format, userId, visibility], index) => ({
  deck: {
    id: `33333333-3333-4333-8333-33333333333${index}`,
    name,
    format,
    userId,
    public: visibility,
    leaderCardId1: leaders[index % leaders.length],
    leaderCardId2: null,
    baseCardId: baseId,
    cardPoolId: null,
    createdAt: new Date(Date.now() - 100 * 3_600_000).toISOString(),
    updatedAt: new Date(Date.now() - Number(hours) * 3_600_000).toISOString(),
    description: '',
  },
  user: { id: userId, displayName: 'Mira' },
  deck_information: {},
  entityPrices: [],
}));
const personalDeck = {
  ...recentDecks[4]!.deck,
  id: '44444444-4444-4444-8444-444444444444',
  name: 'My private daily attempt',
  cardPoolId: data.pool!.id,
  public: 0,
};
const communityDecks = [
  ['Tournament import', 0, 'swubase', 1, 1, 'swubase'],
  ['Hidden community draft', 0.1, 'community-mira', 0, 1, 'Mira'],
  ['Unlisted community idea', 0.2, 'community-mira', 2, 1, 'Mira'],
  ['Naboo space experiments', 1, 'community-mira', 1, 6, 'Mira'],
  ['Unexpected allies', 2, 'community-jules', 1, 1, 'Jules'],
  ['A sealed discovery', 3, 'community-rin', 1, 3, 'Rin'],
  ['Older community idea', 8, 'community-rin', 1, 1, 'Rin'],
  ['New leader, new plan', 4, 'community-mira', 1, 1, 'Mira'],
].map(([name, hours, userId, visibility, format, displayName], index) => ({
  ...recentDecks[0]!,
  deck: {
    ...recentDecks[0]!.deck,
    id: `55555555-5555-4555-8555-55555555555${index}`,
    name,
    userId,
    public: visibility,
    format,
    leaderCardId1: leaders[index % leaders.length],
    createdAt: new Date(Date.now() - Number(hours) * 3_600_000).toISOString(),
    updatedAt: new Date(Date.now() + Number(hours) * 3_600_000).toISOString(),
  },
  user: { id: userId, displayName, image: index === 4 ? '/fixture-avatar.svg' : null },
}));
const server = Bun.serve({
  hostname: '127.0.0.1',
  port: 0,
  async fetch(request) {
    const { pathname, searchParams } = new URL(request.url);
    if (pathname === '/fixture-avatar.svg')
      return new Response(
        '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="#326149"/><circle cx="40" cy="30" r="15" fill="#dce7a0"/></svg>',
        { headers: { 'Content-Type': 'image/svg+xml' } },
      );
    if (/^\/api\/user\/community-[^/]+\/achievements$/.test(pathname))
      return Response.json({ data: { achievements: [] } });
    if (/^\/api\/user\/community-[^/]+\/header$/.test(pathname))
      return Response.json({ data: { image: '/fixture-avatar.svg', width: 1600, height: 400 } });
    if (pathname === '/api/deck') {
      if (deckTableFixture)
        return Response.json({
          data: recentDecks.slice(0, 5).map((row, index) => ({
            ...row,
            deck: {
              ...row.deck,
              leaderCardId1: index >= 2 ? null : row.deck.leaderCardId1,
              leaderCardId2: index === 1 || index === 4 ? leaders[3] : null,
              baseCardId: index === 3 ? null : row.deck.baseCardId,
            },
          })),
          pagination: { hasMore: false },
        });
      if (!searchParams.has('userId')) {
        communityRequests.push(searchParams);
        if (communityState === 'error')
          return Response.json({ message: 'Fixture error' }, { status: 503 });
        const sortField =
          searchParams.get('sort') === 'deck.created_at' ? 'createdAt' : 'updatedAt';
        const matching = communityDecks
          .filter(
            ({ deck }) =>
              communityState !== 'empty' &&
              deck.public === 1 &&
              deck.userId !== searchParams.get('excludeUserId') &&
              (!searchParams.has('format') || deck.format === Number(searchParams.get('format'))),
          )
          .sort((a, b) => b.deck[sortField].localeCompare(a.deck[sortField]));
        const limit = Number(searchParams.get('limit'));
        return Response.json({
          data: matching.slice(0, limit),
          pagination: { hasMore: matching.length > limit },
        });
      }
      deckRequests.push(searchParams);
      if (deckState === 'error')
        return Response.json({ message: 'Fixture error' }, { status: 503 });
      const matching = recentDecks
        .filter(
          ({ deck }) =>
            deckState !== 'empty' &&
            deck.userId === searchParams.get('userId') &&
            deck.format === Number(searchParams.get('format')) &&
            (signedIn || deck.public === 1),
        )
        .sort((a, b) => b.deck.updatedAt.localeCompare(a.deck.updatedAt));
      const limit = Number(searchParams.get('limit'));
      return Response.json({
        data: matching.slice(0, limit),
        pagination: { hasMore: matching.length > limit },
      });
    }
    const bindingPath = pathname.match(/^\/api\/card-pools\/([^/]+)\/discussion$/);
    if (bindingPath) {
      const id = bindingPath[1]!.replace(/^1/, '9');
      discussionRequests.push(id);
      return Response.json({
        data: { id, canModerate: false, total: poolComments.get(id)?.length ?? 0 },
      });
    }
    const discussionPath = pathname.match(
      /^\/api\/discussions\/([^/]+)(?:\/comments(?:\/([^/]+)\/thread)?)?$/,
    );
    if (discussionPath) {
      const [, id, commentId] = discussionPath;
      const comments = poolComments.get(id!) ?? [];
      poolComments.set(id!, comments);
      if (pathname.endsWith('/thread')) {
        const comment = comments.find(comment => comment.id === commentId);
        return Response.json({ data: { path: comment ? [comment] : [] } });
      }
      if (!pathname.endsWith('/comments'))
        return Response.json({ data: { id, canModerate: false, total: comments.length } });
      if (request.method === 'POST') {
        const body = (await request.json()) as Pick<DiscussionComment, 'content' | 'parentId'>;
        const comment: DiscussionComment = {
          id: crypto.randomUUID(),
          discussionId: id!,
          parentId: body.parentId ?? null,
          depth: 0,
          content: body.content,
          authorId: ownerId,
          author: { id: ownerId, displayName: 'Mira', image: null },
          revision: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          deletedAt: null,
          replyCount: 0,
        };
        comments.unshift(comment);
        return Response.json({ data: comment }, { status: 201 });
      }
      return Response.json({ data: comments, total: comments.length, nextCursor: null });
    }
    if (pathname === '/api/card-pools/daily') {
      dailyRequests.push(searchParams.get('date'));
      if (state === 'error') return Response.json({ message: 'Fixture error' }, { status: 503 });
      const selected = dailyFixture(searchParams.get('date') ?? today);
      return Response.json({
        data:
          state === 'empty'
            ? { ...selected, pool: null, availableDates: [] }
            : state === 'fallback' && selected.date === today
              ? {
                  ...dailyFixture(dayBefore(1)),
                  date: today,
                  availableDates: data.availableDates.slice(1),
                }
              : state === 'no-decks' && selected.pool
                ? {
                    ...selected,
                    pool: { ...selected.pool, publicDeckCount: 0, builderCount: 0, decks: [] },
                  }
                : selected,
      });
    }
    const poolPath = pathname.match(/^\/api\/card-pools\/([^/]+)(?:\/(cards|decks))?$/);
    if (poolPath) {
      const [, poolId, resource] = poolPath;
      if (resource === 'decks' && request.method === 'POST') {
        const body = (await request.json()) as { visibility: string };
        createdDecks.push({ poolId: poolId!, visibility: body.visibility });
        // Inspect submitted choices without navigating to a fixture deckbuilder.
        return Response.json({ message: 'Fixture creation stopped' }, { status: 400 });
      }
      if (resource === 'cards') return Response.json({});
      if (resource === 'decks') {
        if (searchParams.has('userId')) personalRequests.push(searchParams);
        if (personalState === 'error')
          return Response.json({ message: 'Fixture error' }, { status: 503 });
        return Response.json({
          data:
            (poolDetailDecks || personalState === 'ready') &&
            signedIn &&
            (poolDetailDecks || searchParams.get('userId') === ownerId) &&
            poolId === personalDeck.cardPoolId
              ? [{ deck: personalDeck, user: { id: ownerId, displayName: 'Mira' } }]
              : [],
          pagination: { hasMore: false },
        });
      }
      return Response.json({
        data: {
          id: poolId,
          name: data.pool!.name,
          set: SwuSet.HMW,
          userId: 'swubase',
          type: 'sealed',
          status: 'ready',
          visibility: poolVisibility,
          leaders: leaders.join(','),
          custom: false,
          hasDecks: false,
        },
      });
    }
    if (pathname === '/api/cards')
      return Response.json({
        official: { needsUpdate: true, lastUpdated: 'today-browser-fixture', cards: cardList },
        preview: { needsUpdate: true, lastUpdated: 'today-browser-fixture', cards: {} },
        karabast_unimplemented: {},
      });
    if (pathname === '/api/auth/get-session')
      return Response.json(
        signedIn
          ? {
              user: {
                id: ownerId,
                name: 'Mira',
                displayName: 'Mira',
                email: 'mira@invalid.local',
                emailVerified: true,
                role: 'user',
                currency: 'USD',
                image: null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
              session: {
                id: 'fixture-session',
                userId: ownerId,
                token: 'fixture',
                expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
              },
            }
          : null,
      );
    if (pathname === '/api/auth/sign-out') {
      signedIn = false;
      return Response.json({ success: true });
    }
    if (pathname === '/api/user-settings') return Response.json({});
    if (pathname === '/api/application-configuration')
      return Response.json({ homepageMode: applicationMode });
    if (pathname === '/api/tournament-weekends/live') return Response.json({ data: null });
    if (pathname.startsWith('/api/daily-snapshot'))
      return Response.json({ data: { sections: {} } });
    if (pathname.startsWith('/api/')) return Response.json({ data: [] });
    const path = resolve(dist, `.${pathname}`);
    if (path.startsWith(dist + '/') && (await Bun.file(path).exists()))
      return new Response(Bun.file(path));
    return new Response(Bun.file(resolve(dist, 'index.html')));
  },
});
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1500, height: 1100 } });
const expect = baseExpect.configure({ timeout: 20_000 });
const page = await context.newPage();
page.setDefaultTimeout(20_000);
const errors: string[] = [];
page.on('pageerror', error => errors.push(error.message));
await context.addInitScript(() => {
  localStorage.setItem('cookie-consent', 'true');
  localStorage.setItem('vite-ui-theme', 'light');
});
const output = resolve(import.meta.dir, '../../.swubase/today-home');
await mkdir(output, { recursive: true });

const openToday = async () => {
  await page.goto(`${server.url}?homeMode=today`);
  await expect(page.getByRole('heading', { name: 'Daily sealed pool', exact: true })).toBeVisible();
  await expect(page.locator('a.today-leader')).toHaveCount(data.pool!.leaders.length);
};
const noHorizontalScroll = async () => {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  expect(await page.locator('.today-home').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(
    true,
  );
};
const capture = async (name: string) => {
  await page.mouse.move(0, 0);
  await page.evaluate(async () => {
    await Promise.all(
      [...document.querySelectorAll<HTMLImageElement>('.today-home img')].map(img =>
        img.decode().catch(() => undefined),
      ),
    );
  });
  await page
    .locator('.today-home')
    .screenshot({ path: `${output}/${name}.png`, animations: 'disabled' });
};

try {
  await page.setViewportSize({ width: 1500, height: 1600 });
  await openToday();
  const brewing = page.getByRole('region', { name: 'What others are brewing' });
  await expect(brewing).toBeVisible();
  await expect(page.locator('.today-community-deck h3')).toHaveText([
    'Unexpected allies',
    'New leader, new plan',
    'Older community idea',
  ]);
  expect(Object.fromEntries(communityRequests.at(-1)!)).toMatchObject({
    excludeUserId: 'swubase',
    format: '1',
    limit: '3',
    offset: '0',
    sort: 'deck.created_at',
    order: 'desc',
  });
  for (const [index, fixtureIndex] of [4, 7, 6].entries()) {
    await expect(
      page.locator('.today-community-deck .compact-deck-title a').nth(index),
    ).toHaveAttribute('href', `/decks/${communityDecks[fixtureIndex]!.deck.id}`);
    await expect(page.locator('.today-community-author').nth(index)).toHaveAccessibleName(
      `View ${communityDecks[fixtureIndex]!.user.displayName}'s profile`,
    );
  }
  const profileTrigger = brewing.getByRole('button', { name: "View Jules's profile" });
  await expect(profileTrigger.locator('img')).toHaveAttribute('src', '/fixture-avatar.svg');
  await expect(brewing.getByRole('button', { name: "View Mira's profile" })).toContainText('MI');
  const beforeProfile = page.url();
  // The avatar must open the shared profile popover through the deck's stretched link.
  await profileTrigger.locator('img').click();
  const profilePopover = page.getByRole('dialog', { name: "Jules's profile" });
  await expect(profilePopover.getByRole('link', { name: 'Open profile' })).toHaveAttribute(
    'href',
    '/users/community-jules',
  );
  expect(page.url()).toBe(beforeProfile);
  await page.keyboard.press('Escape');
  await expect(profileTrigger).toBeFocused();
  await profileTrigger.press('Enter');
  await expect(profilePopover).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.today-resume-deck')).toHaveCount(3);
  await expect(page.locator('.today-resume-deck h3')).toHaveText([
    'Sabine — tempo rebuild',
    'Han — new set experiments',
    'Vader — weekend testing with a longer deck name for the next Planetary Qualifier',
  ]);
  expect(Object.fromEntries(deckRequests.at(-1)!)).toMatchObject({
    userId: ownerId,
    format: '1',
    limit: '3',
    offset: '0',
    sort: 'deck.updated_at',
    order: 'desc',
  });
  for (const [index, fixtureIndex] of [1, 0, 2].entries()) {
    await expect(
      page.locator('.today-resume-deck .compact-deck-title a').nth(index),
    ).toHaveAttribute('href', `/decks/${recentDecks[fixtureIndex]!.deck.id}`);
  }
  await expect(page.locator('.today-resume-visibility')).toHaveText([
    'Unlisted',
    'Private',
    'Public',
  ]);
  await expect(page.locator('.today-deck')).toHaveCount(3);
  await expect(page.getByRole('link', { name: /Build this pool/ })).toHaveAttribute(
    'href',
    expect.stringContaining('poolDeckVisibility=public'),
  );
  await expect(page.getByText('THE DAILY SEALED', { exact: true })).toHaveCount(0);
  await expect(
    page.getByText('Everyone gets the same eight packs. What would you build?'),
  ).toBeVisible();
  await expect(page.locator('.today-pool-date time')).toHaveAttribute('datetime', today);
  await expect(page.getByText('120 cards', { exact: true })).toHaveCount(0);
  await expect(page.getByText(/leaders to explore/)).toHaveCount(0);
  await expect(page.locator('.today-resume-deck .compact-deck-card')).toHaveCount(6);
  for (let i = 0; i < 3; i++) {
    await expect(page.locator('.today-deck .compact-deck-title a').nth(i)).toHaveAttribute(
      'href',
      `/limited/deck/${data.pool!.decks[i]!.id}`,
    );
  }
  await expect(page.getByRole('link', { name: 'View all 6' })).toBeVisible();
  await expect(page.getByRole('radio', { name: /layout/i })).toHaveCount(0);
  const geometry = await page.evaluate(() => {
    const panel = document.querySelector('.today-sealed-panel')!.getBoundingClientRect();
    const community = document.querySelector('.today-brewing')!.getBoundingClientRect();
    const personal = document.querySelector('.today-continue')!.getBoundingClientRect();
    const cards = [...document.querySelectorAll('.today-leader')].map(el =>
      el.getBoundingClientRect(),
    );
    return {
      equalColumns: Math.abs(panel.width - community.width) < 2,
      rightColumn: community.left > panel.right,
      communityAbovePersonal: community.bottom < personal.top,
      overTop: Math.min(...cards.map(card => card.top)) < panel.top,
      overSide: cards[0]!.left < panel.left || cards.at(-1)!.right > panel.right,
      overlapping: cards.slice(1).every((card, i) => card.left < cards[i]!.right),
    };
  });
  expect(geometry).toEqual({
    equalColumns: true,
    rightColumn: true,
    communityAbovePersonal: true,
    overTop: true,
    overSide: true,
    overlapping: true,
  });
  // All lists share a slim row while the full-card artwork can overflow it.
  const rows = await page.locator('.compact-deck-row').evaluateAll(elements =>
    elements.map(el => {
      const rect = el.getBoundingClientRect();
      const artwork = [...el.querySelectorAll('.compact-deck-card')].map(card =>
        card.getBoundingClientRect(),
      );
      const target = document
        .elementFromPoint(rect.right - 10, rect.top + rect.height / 2)
        ?.closest('a');
      return {
        slim: rect.height <= 74,
        overflows: artwork.some(card => card.top < rect.top || card.bottom > rect.bottom),
        linked:
          target?.getAttribute('href') ===
          el.querySelector('.compact-deck-title a')?.getAttribute('href'),
      };
    }),
  );
  expect(rows).toHaveLength(9);
  expect(rows.every(row => row.slim && row.overflows && row.linked)).toBe(true);
  expect(
    await page
      .locator('.compact-deck-title a')
      .evaluateAll(links =>
        links.some(
          link =>
            link.getBoundingClientRect().height >
            parseFloat(getComputedStyle(link).lineHeight) * 1.5,
        ),
      ),
  ).toBe(true);

  const author = page.locator('.today-deck-author a').first();
  await author.focus();
  await expect(author).toBeFocused();
  await expect(author).toHaveAttribute('href', '/users/example-0');
  await capture('hand-light');
  await page.screenshot({ path: `${output}/homepage-menu-light.png`, fullPage: true });
  await noHorizontalScroll();
  await page.evaluate(() => {
    document.documentElement.classList.remove('light');
    document.documentElement.classList.add('dark');
  });
  await capture('hand-dark');
  await page.screenshot({ path: `${output}/homepage-menu-dark.png`, fullPage: true });
  await page.evaluate(() => {
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');
  });

  // Hovering the exposed bottom edge must stay stable while the artwork lifts.
  await page.mouse.move(0, 0);
  const hoverPoint = await page
    .locator('a.today-leader')
    .last()
    .evaluate(el => {
      const rect = el.getBoundingClientRect();
      const matrix = new DOMMatrix(getComputedStyle(el).transform);
      const width = (el as HTMLElement).offsetWidth;
      const height = (el as HTMLElement).offsetHeight;
      const corners = [
        [0, 0],
        [width, 0],
        [0, height],
        [width, height],
      ].map(([x, y]) => new DOMPoint(x, y).matrixTransform(matrix));
      const point = new DOMPoint(width * 0.1, height - 2).matrixTransform(matrix);
      return {
        x: rect.left + point.x - Math.min(...corners.map(p => p.x)),
        y: rect.top + point.y - Math.min(...corners.map(p => p.y)),
      };
    });
  for (const offset of [0, 1, 2, 3, 2, 1, 0]) {
    await page.mouse.move(hoverPoint.x + offset, hoverPoint.y);
    await page.waitForTimeout(100);
    expect(
      await page
        .locator('a.today-leader')
        .last()
        .evaluate(el => el.matches(':hover')),
    ).toBe(true);
  }
  await page.mouse.move(0, 0);

  // Every overlapping card remains keyboard-accessible and opens the existing details.
  for (const leader of await page.locator('a.today-leader').all()) {
    await leader.focus();
    await expect(leader).toBeFocused();
    await expect(leader).toHaveCSS('z-index', '20');
  }
  await page.locator('a.today-leader').first().focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/modalCardId=/);
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  // The topmost card also supports pointer interaction.
  await page.getByRole('heading', { name: 'Daily sealed pool', exact: true }).click();
  await page.locator('a.today-leader').last().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');

  // Dates are shareable, cached separately, and retain the selected pool in card dialogs.
  await openToday();
  expect(dailyRequests.at(-1)).toBe(null);
  const calendarButton = page.getByRole('button', { name: /^Choose pool date,/ });
  await calendarButton.focus();
  await page.keyboard.press('Enter');
  const calendar = page.getByRole('dialog', { name: 'Choose a daily pool' });
  await expect(calendar).toBeVisible();
  await expect(calendar.locator('button[data-day][disabled]').first()).toBeVisible();
  const calendarDay = (date: string) =>
    new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { timeZone: 'UTC' });
  const selectedCalendarDay = calendar.locator(`button[data-day="${calendarDay(dayBefore(2))}"]`);
  if (!(await selectedCalendarDay.count()))
    await calendar.getByRole('button', { name: 'Go to the Previous Month' }).click();
  await selectedCalendarDay.click();
  await expect(calendar).toHaveCount(0);
  await expect(page).toHaveURL(new RegExp(`poolDate=${dayBefore(2)}`));
  await expect(page.locator('.today-pool-date time')).toHaveAttribute('datetime', dayBefore(2));
  await calendarButton.click();
  await page.keyboard.press('Escape');
  await expect(calendarButton).toBeFocused();
  await page.getByRole('link', { name: 'Back to today' }).click();

  // Missing dates are skipped in both directions; the oldest pool has no dead-end arrow.
  const allDates = data.availableDates;
  data.availableDates = [today, dayBefore(2), dayBefore(5)];
  await openToday();
  await page.getByRole('link', { name: 'Previous pool' }).click();
  await expect(page.locator('.today-pool-date time')).toHaveAttribute('datetime', dayBefore(2));
  await page.getByRole('link', { name: 'Previous pool' }).click();
  await expect(page.getByRole('link', { name: 'Previous pool' })).toHaveCount(0);
  await page.getByRole('link', { name: 'Next pool', exact: true }).click();
  await expect(page.locator('.today-pool-date time')).toHaveAttribute('datetime', dayBefore(2));
  data.availableDates = allDates;
  await openToday();

  state = 'fallback';
  await page.goto(`${server.url}?homeMode=today`);
  await expect(page.locator('.today-pool-date time')).toHaveAttribute('datetime', dayBefore(1));
  await expect(page.locator('.today-pool-notice')).toContainText('Today’s pool is on its way.');
  await expect(page.getByRole('link', { name: 'Back to today' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: /Build this pool/ })).toHaveAttribute(
    'href',
    expect.stringContaining(dailyFixture(dayBefore(1)).pool!.id),
  );
  await page.locator('a.today-leader').last().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(new URL(page.url()).searchParams.has('poolDate')).toBe(false);
  await page.keyboard.press('Escape');
  await expect(page.locator('.today-pool-notice')).toBeVisible();
  await calendarButton.click();
  await expect(calendar.locator(`button[data-day="${calendarDay(today)}"]`)).toBeDisabled();
  await page.keyboard.press('Escape');
  state = 'ready';
  await page.locator('.today-pool-notice').getByRole('button', { name: 'Check again' }).click();
  await expect(page.locator('.today-pool-date time')).toHaveAttribute('datetime', today);
  await expect(page.locator('.today-pool-notice')).toHaveCount(0);
  expect(new URL(page.url()).searchParams.has('poolDate')).toBe(false);
  for (let days = 1; days <= 5; days++) {
    const selectedDate = dayBefore(days);
    await page.getByRole('link', { name: 'Previous pool' }).click();
    await expect(page).toHaveURL(new RegExp(`poolDate=${selectedDate}`));
    await expect(page.locator('.today-pool-date time')).toHaveAttribute('datetime', selectedDate);
    await expect(page.locator('.today-deck h4').first()).toHaveText(
      `${selectedDate} · The patient approach`,
    );
    await expect(page.locator('a.today-leader')).toHaveCount(4);
    const buildUrl = new URL(
      (await page.getByRole('link', { name: /Build this pool/ }).getAttribute('href'))!,
      server.url,
    );
    expect(buildUrl.pathname).toBe(`/limited/pool/${dailyFixture(selectedDate).pool!.id}/detail`);
    expect(Object.fromEntries(buildUrl.searchParams)).toEqual({ poolDeckVisibility: 'public' });
  }
  await page.reload();
  await expect(page.locator('.today-pool-date time')).toHaveAttribute('datetime', dayBefore(5));
  await page.getByRole('link', { name: 'Next pool', exact: true }).click();
  await expect(page.locator('.today-pool-date time')).toHaveAttribute('datetime', dayBefore(4));
  await page.goBack();
  await expect(page.locator('.today-pool-date time')).toHaveAttribute('datetime', dayBefore(5));
  await page.goForward();
  await expect(page.locator('.today-pool-date time')).toHaveAttribute('datetime', dayBefore(4));
  await page.locator('a.today-leader').last().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`poolDate=${dayBefore(4)}`));
  await page.keyboard.press('Escape');
  await expect(page.locator('.today-pool-date time')).toHaveAttribute('datetime', dayBefore(4));
  await page.getByRole('link', { name: 'Back to today' }).click();
  expect(new URL(page.url()).searchParams.has('poolDate')).toBe(false);
  await expect(page.locator('a.today-leader')).toHaveCount(6);
  await expect(page.locator('.today-deck h4').first()).toHaveText('The patient approach');
  await page.goto(`${server.url}?homeMode=today&poolDate=${dayBefore(6)}`);
  await expect(page.getByRole('heading', { name: 'No pool for this day.' })).toBeVisible();
  await page.getByRole('link', { name: 'Next pool', exact: true }).click();
  await expect(page.locator('.today-pool-date time')).toHaveAttribute('datetime', dayBefore(5));
  await page.getByRole('radio', { name: 'Two-week Meta', exact: true }).click();
  expect(new URL(page.url()).searchParams.has('poolDate')).toBe(false);
  await page.getByRole('radio', { name: 'Today', exact: true }).click();
  await expect(page.locator('.today-pool-date time')).toHaveAttribute('datetime', today);
  await page.goto(`${server.url}?homeMode=today&poolDate=2026-02-30`);
  await expect(page.locator('.today-pool-date time')).toHaveAttribute('datetime', today);
  expect(dailyRequests.at(-1)).toBe(null);

  // The server selects "today", even if this device's UTC clock is a day ahead.
  await page.clock.setFixedTime(new Date(`${dayBefore(-1)}T12:00:00Z`));
  state = 'empty';
  await page.goto(`${server.url}?homeMode=today`);
  await expect(page.getByRole('heading', { name: 'Today’s pool is on its way.' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Back to today' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Next pool', exact: true })).toHaveCount(0);
  state = 'ready';
  await openToday();
  await page.locator('a.today-leader').last().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(new URL(page.url()).searchParams.has('poolDate')).toBe(false);
  await page.keyboard.press('Escape');
  for (const clockDay of [dayBefore(-1), dayBefore(1)]) {
    await page.clock.setFixedTime(new Date(`${clockDay}T12:00:00Z`));
    await page.goto(`${server.url}?homeMode=today&poolDate=${dayBefore(1)}`);
    await expect(page.locator('.today-pool-date time')).toHaveAttribute('datetime', dayBefore(1));
    await expect(page.getByRole('link', { name: 'Back to today' })).toBeVisible();
    await page.getByRole('link', { name: 'Next pool', exact: true }).click();
    expect(new URL(page.url()).searchParams.has('poolDate')).toBe(false);
    await expect(page.locator('.today-pool-date time')).toHaveAttribute('datetime', today);
    await expect(page.getByRole('link', { name: 'Next pool', exact: true })).toHaveCount(0);
    state = 'empty';
    await page.goto(`${server.url}?homeMode=today&poolDate=${dayBefore(1)}`);
    await expect(page.getByRole('heading', { name: 'No pool for this day.' })).toBeVisible();
    state = 'ready';
    await page.getByRole('link', { name: 'Back to today' }).click();
    await expect(page.locator('.today-pool-date time')).toHaveAttribute('datetime', today);
  }
  await page.clock.setFixedTime(new Date());

  // Discussions load on demand, retain drafts when navigation is cancelled, and have day-specific links.
  expect(discussionRequests).toHaveLength(0);
  const poolBeforeDiscussion = await page.locator('.today-sealed-panel').elementHandle();
  await page.getByRole('link', { name: 'Pool discussion', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Pool discussion', exact: true })).toBeVisible();
  expect(await poolBeforeDiscussion!.evaluate(node => node.isConnected)).toBe(true);
  expect(new URL(page.url()).searchParams.get('poolDate')).toBe(today);
  await page.getByRole('button', { name: 'Write a comment', exact: true }).click();
  const editor = page.locator('[contenteditable=true]').first();
  await editor.fill('I would build green with the blue base.');
  page.once('dialog', dialog => void dialog.dismiss());
  await page.getByRole('link', { name: 'Pool discussion', exact: true }).click();
  await expect(editor).toContainText('I would build green with the blue base.');
  await page.getByRole('button', { name: 'Post comment', exact: true }).click();
  const discussion = page.getByRole('region', { name: 'Pool discussion', exact: true });
  await expect(
    discussion.getByText('I would build green with the blue base.', { exact: true }),
  ).toBeVisible();
  const threadId = data.pool!.id.replace(/^1/, '9');
  const postedId = poolComments.get(threadId)![0]!.id;
  await page.getByRole('link', { name: 'Pool discussion', exact: true }).click();
  await expect(discussion).toHaveCount(0);
  signedIn = false;
  await page.goto(
    `${server.url}?homeMode=today&poolDate=${today}&poolDiscussion=true&poolComment=${postedId}`,
  );
  await expect(
    discussion.getByText('I would build green with the blue base.', { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign in to comment', exact: true })).toBeVisible();
  await expect(page.locator('[contenteditable=true]')).toHaveCount(0);
  await noHorizontalScroll();
  await capture('daily-pool-discussion');
  await page.getByRole('link', { name: 'Previous pool', exact: true }).click();
  await expect(discussion).toBeVisible();
  await expect(
    discussion.getByText('I would build green with the blue base.', { exact: true }),
  ).toHaveCount(0);
  expect(new URL(page.url()).searchParams.has('poolComment')).toBe(false);
  signedIn = true;
  await openToday();

  // The CTA presets Public; users can change it. Direct pool visits inherit the pool privacy.
  await page.getByRole('link', { name: /Build this pool/ }).click();
  await expect(page.getByRole('radio', { name: 'Public', exact: true })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await page.reload();
  await expect(page.getByRole('radio', { name: 'Public', exact: true })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await page.getByRole('button', { name: 'Start a new deck!' }).click();
  await expect(page.getByText('Fixture creation stopped')).toBeVisible();
  expect(createdDecks.at(-1)).toEqual({ poolId: data.pool!.id, visibility: 'public' });
  await page.getByRole('radio', { name: 'Private', exact: true }).click();
  await page.getByPlaceholder('Deck name').fill('My private take');
  await page.getByRole('button', { name: 'Start a new deck!' }).click();
  await expect.poll(() => createdDecks.at(-1)?.visibility).toBe('private');
  await page.goto(`${server.url}limited/pool/${data.pool!.id}/detail`);
  await expect(page.getByRole('radio', { name: 'Public', exact: true })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await page.goto(`${server.url}limited/pool/${data.pool!.id}/detail?poolDeckVisibility=invalid`);
  await expect(page.getByRole('radio', { name: 'Public', exact: true })).toHaveAttribute(
    'aria-checked',
    'true',
  );

  for (const visibility of ['private', 'unlisted', 'public'] as const) {
    poolVisibility = visibility;
    await page.goto(`${server.url}limited/pool/${data.pool!.id}/detail`);
    await expect(
      page.getByRole('radio', {
        name: visibility[0]!.toUpperCase() + visibility.slice(1),
        exact: true,
      }),
    ).toHaveAttribute('aria-checked', 'true');
  }
  poolVisibility = 'unlisted';
  await page.goto(`${server.url}limited/pool/${data.pool!.id}/detail?poolDeckVisibility=public`);
  await expect(page.getByRole('radio', { name: 'Public', exact: true })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  poolVisibility = 'public';
  poolDetailDecks = true;
  await page.reload();
  await expect(page.locator('.deck-artwork .compact-deck-card')).toHaveCount(2);
  await expect(
    page.getByRole('link', { name: 'My private daily attempt', exact: true }),
  ).toHaveAttribute('href', `/limited/deck/${personalDeck.id}`);
  await page.screenshot({ path: `${output}/pool-detail-artwork.png`, fullPage: true });
  poolDetailDecks = false;

  for (const width of [1100, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1600 });
    await openToday();
    await noHorizontalScroll();
    if (width <= 1000) {
      const panel = await page.locator('.today-sealed-panel').boundingBox();
      const community = await brewing.boundingBox();
      const personal = await page.locator('.today-continue').boundingBox();
      expect(community!.y).toBeGreaterThan(panel!.y + panel!.height);
      expect(personal!.y).toBeGreaterThan(community!.y + community!.height);
    }
    if (width === 390) {
      await brewing.getByRole('button', { name: "View Jules's profile" }).click();
      await expect(profilePopover.getByRole('link', { name: 'Open profile' })).toBeVisible();
      const profileBox = (await profilePopover.boundingBox())!;
      expect(profileBox.x).toBeGreaterThanOrEqual(0);
      expect(profileBox.x + profileBox.width).toBeLessThanOrEqual(width);
      await page.keyboard.press('Escape');
      await capture('hand-mobile');
      await page.screenshot({ path: `${output}/homepage-menu-mobile.png`, fullPage: true });
    }
  }
  // Check both ends of the possible leader count, including repeated pulls.
  const originalLeaders = data.pool!.leaders;
  for (const count of [1, 8]) {
    data.pool!.leaders = getCardPoolMap(SwuSet.HMW)
      .leaders.Common.slice(0, count)
      .map(cardId => ({ cardId, copies: count === 1 ? 8 : 1 }));
    await openToday();
    await noHorizontalScroll();
  }
  data.pool!.leaders = originalLeaders;

  for (const next of ['no-decks', 'empty', 'error'] as const) {
    state = next;
    await page.goto(`${server.url}?homeMode=today`);
    if (next === 'no-decks')
      await expect(page.getByText('The first idea could be yours.')).toBeVisible();
    if (next === 'empty')
      await expect(
        page.getByRole('heading', { name: 'Today’s pool is on its way.' }),
      ).toBeVisible();
    if (next === 'error') await expect(page.getByRole('alert')).toContainText('couldn’t be loaded');
    await expect(page.getByRole('heading', { name: 'Continue with your decks' })).toBeVisible();
  }
  state = 'ready';
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByRole('heading', { name: 'Daily sealed pool', exact: true })).toBeVisible();

  await page.setViewportSize({ width: 1500, height: 1600 });
  // Returning to Today must fetch the latest activity, even with a cached list.
  await page.getByRole('radio', { name: 'Two-week Meta', exact: true }).click();
  recentDecks[2]!.deck.updatedAt = new Date().toISOString();
  const beforeReturn = deckRequests.length;
  await page.getByRole('radio', { name: 'Today', exact: true }).click();
  await expect(page.locator('.today-resume-deck h3').first()).toHaveText(
    'Vader — weekend testing with a longer deck name for the next Planetary Qualifier',
  );
  expect(deckRequests.length).toBeGreaterThan(beforeReturn);

  for (const next of ['empty', 'error'] as const) {
    deckState = next;
    await openToday();
    await expect(page.locator('.today-resume-deck')).toHaveCount(0);
    if (next === 'empty')
      await expect(page.getByText('Make room for your next idea.')).toBeVisible();
    else
      await expect(page.locator('.today-continue [role=alert]')).toContainText(
        'couldn’t be loaded',
      );
  }
  deckState = 'ready';
  await page.getByRole('button', { name: 'Retry loading decks' }).click();
  await expect(page.locator('.today-resume-deck')).toHaveCount(3);

  for (const next of ['empty', 'error'] as const) {
    communityState = next;
    await openToday();
    await expect(page.locator('.today-community-deck')).toHaveCount(0);
    if (next === 'empty')
      await expect(brewing.getByText('A fresh idea starts with you.')).toBeVisible();
    else
      await expect(brewing.getByRole('alert')).toContainText('Community decks couldn’t be loaded.');
    await expect(page.locator('.today-resume-deck')).toHaveCount(3);
  }
  communityState = 'ready';
  await brewing.getByRole('button', { name: 'Retry community decks' }).click();
  await expect(page.locator('.today-community-deck')).toHaveCount(3);

  personalState = 'error';
  await openToday();
  await expect(page.locator('.today-own-state[role="alert"]')).toContainText(
    'Couldn’t load your build.',
  );
  personalState = 'ready';
  await page.locator('.today-own-state').getByRole('button', { name: 'Retry' }).click();
  await expect(page.locator('.today-own-deck')).toContainText('My private daily attempt');
  await expect(page.locator('.today-own-deck')).toContainText('Private');
  await expect(page.getByRole('link', { name: 'Open your build' })).toHaveAttribute(
    'href',
    `/limited/deck/${personalDeck.id}`,
  );
  await expect(page.getByRole('link', { name: 'Try another build' })).toHaveAttribute(
    'href',
    expect.stringContaining('poolDeckVisibility=public'),
  );
  await expect(page.locator('.today-deck')).toHaveCount(3);
  await expect(page.locator('.today-builds')).not.toContainText(personalDeck.name);
  expect(Object.fromEntries(personalRequests.at(-1)!)).toMatchObject({
    userId: ownerId,
    limit: '1',
    sort: 'updated_at',
    order: 'desc',
  });
  await capture('own-build-desktop');
  await page.setViewportSize({ width: 390, height: 1500 });
  await noHorizontalScroll();
  await capture('own-build-mobile');
  await page.setViewportSize({ width: 1500, height: 1600 });

  // A slow personal query must not offer a different destination before it resolves.
  let releaseBuild!: () => void;
  const buildGate = new Promise<void>(resolve => {
    releaseBuild = resolve;
  });
  const matchesBuild = (url: URL) =>
    url.pathname === `/api/card-pools/${data.pool!.id}/decks` &&
    url.searchParams.get('userId') === ownerId;
  await page.route(matchesBuild, async route => {
    await buildGate;
    await route.continue();
  });
  try {
    await openToday();
    await expect(
      page.getByRole('button', { name: 'Loading your build', exact: true }),
    ).toBeDisabled();
    await expect(page.getByRole('link', { name: 'Build this pool', exact: true })).toHaveCount(0);
    releaseBuild();
    await expect(page.getByRole('link', { name: 'Open your build' })).toHaveAttribute(
      'href',
      `/limited/deck/${personalDeck.id}`,
    );
  } finally {
    releaseBuild();
    await page.unroute(matchesBuild);
  }

  // Use the actual sign-out control without reloading, so cached private decks cannot linger.
  await page.getByRole('button', { name: 'Account menu' }).click();
  await page.getByRole('menuitem', { name: 'Log out' }).click();
  await expect(page.locator('.today-resume-deck')).toHaveCount(0);
  await expect(page.locator('.today-own-deck')).toHaveCount(0);
  await expect(page.getByText(personalDeck.name)).toHaveCount(0);
  const guestRequests = deckRequests.length;
  const guestPersonalRequests = personalRequests.length;
  await expect(page.getByRole('region', { name: 'Continue with your decks' })).toHaveCount(0);
  await expect(page.locator('.today-community-deck')).toHaveCount(3);
  await capture('continue-guest');
  await openToday();
  await expect(page.getByRole('region', { name: 'Continue with your decks' })).toHaveCount(0);
  await expect(page.locator('.today-community-deck')).toHaveCount(3);
  expect(deckRequests).toHaveLength(guestRequests);
  expect(personalRequests).toHaveLength(guestPersonalRequests);
  await page.getByRole('link', { name: /Build this pool/ }).click();
  await expect(page.getByRole('radio', { name: 'Public', exact: true })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await expect(page.getByRole('button', { name: 'Sign in to start a deck' })).toBeVisible();
  expect(createdDecks).toHaveLength(2);

  // Personal decks must wait for auth so a cookie-authenticated response can
  // never land in the anonymous cache while the session is still loading.
  signedIn = true;
  let releaseSession!: () => void;
  const sessionGate = new Promise<void>(resolve => {
    releaseSession = resolve;
  });
  const sessionStarted = page.waitForRequest(
    request => new URL(request.url()).pathname === '/api/auth/get-session',
  );
  await page.route('**/api/auth/get-session*', async route => {
    await sessionGate;
    await route.continue();
  });
  const beforeSession = deckRequests.length;
  const beforePersonalSession = personalRequests.length;
  try {
    await page.goto(`${server.url}?homeMode=today`);
    await sessionStarted;
    await expect(page.getByRole('region', { name: 'Continue with your decks' })).toHaveCount(0);
    await expect(page.locator('.today-community-deck')).toHaveCount(3);
    await page.waitForTimeout(200);
    expect(deckRequests).toHaveLength(beforeSession);
    expect(personalRequests).toHaveLength(beforePersonalSession);
    releaseSession();
    await expect.poll(() => deckRequests.length).toBeGreaterThan(beforeSession);
    await expect(page.locator('.today-resume-deck')).toHaveCount(3);
    await expect(page.locator('.today-own-deck')).toContainText(personalDeck.name);
  } finally {
    releaseSession();
    await page.unroute('**/api/auth/get-session*');
  }

  // The selected homepage mode survives bare-root visits and reloads.
  const storedMode = () => page.evaluate(() => localStorage.getItem('swubase.homepage-mode'));
  await openToday();
  await expect.poll(storedMode).toBe('today');
  await page.getByRole('radio', { name: 'Today', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('radio', { name: 'Live Weekend', exact: true })).toBeFocused();
  await page.keyboard.press('Space');
  await expect.poll(storedMode).toBe('live');
  for (const [mode, label] of [
    ['snapshot', 'Two-week Meta'],
    ['live', 'Live Weekend'],
    ['today', 'Today'],
  ]) {
    await page.getByRole('radio', { name: label, exact: true }).click();
    await expect.poll(storedMode).toBe(mode);
    await page.goto(String(server.url));
    await expect(page.getByRole('radio', { name: label, exact: true })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(new URL(page.url()).searchParams.has('homeMode')).toBe(false);
    await page.reload();
    await expect(page.getByRole('radio', { name: label, exact: true })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  }
  // Explicit URLs override the remembered mode and become the latest choice.
  await page.goto(`${server.url}?homeMode=snapshot`);
  await expect(page.getByRole('radio', { name: 'Two-week Meta', exact: true })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await expect.poll(storedMode).toBe('snapshot');
  await page.goto(`${server.url}?homeMode=live&streamId=example-stream`);
  await expect(page.getByRole('navigation', { name: 'Homepage sections' })).toHaveCount(0);
  expect(await storedMode()).toBe('snapshot');
  // Invalid storage and a fresh browser use the configured fallback.
  applicationMode = 'live';
  await page.evaluate(() => localStorage.setItem('swubase.homepage-mode', 'invalid'));
  await page.goto(String(server.url));
  await expect(page.getByRole('radio', { name: 'Live Weekend', exact: true })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await page.evaluate(() => localStorage.removeItem('swubase.homepage-mode'));
  await page.reload();
  await expect(page.getByRole('radio', { name: 'Live Weekend', exact: true })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  // Same-origin storage changes update a bare homepage in another tab.
  const otherTab = await context.newPage();
  try {
    await otherTab.goto(`${server.url}?homeMode=today`);
    await expect(page.getByRole('radio', { name: 'Today', exact: true })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await expect(
      page.getByRole('heading', { name: 'Daily sealed pool', exact: true }),
    ).toBeVisible();
  } finally {
    await otherTab.close();
  }
  // A denied localStorage write must not break tab navigation.
  const blockedContext = await browser.newContext();
  try {
    await blockedContext.addInitScript(() => {
      localStorage.setItem('cookie-consent', 'true');
      const getItem = Storage.prototype.getItem;
      const setItem = Storage.prototype.setItem;
      Storage.prototype.getItem = function (key: string) {
        if (key === 'swubase.homepage-mode')
          throw new DOMException('Storage blocked', 'SecurityError');
        return getItem.call(this, key);
      };
      Storage.prototype.setItem = function (key: string, value: string) {
        if (key === 'swubase.homepage-mode')
          throw new DOMException('Storage blocked', 'SecurityError');
        return setItem.call(this, key, value);
      };
    });
    const blockedPage = await blockedContext.newPage();
    blockedPage.on('pageerror', error => errors.push(error.message));
    await blockedPage.goto(String(server.url));
    await expect(
      blockedPage.getByRole('radio', { name: 'Live Weekend', exact: true }),
    ).toHaveAttribute('aria-checked', 'true');
    await blockedPage.getByRole('radio', { name: 'Today', exact: true }).click();
    await expect(
      blockedPage.getByRole('heading', { name: 'Daily sealed pool', exact: true }),
    ).toBeVisible();
  } finally {
    await blockedContext.close();
  }
  // An empty archive is not a placeholder for an uncached current-day request.
  const emptyArchivePage = await context.newPage();
  let resumeToday: () => void = () => {};
  const todayGate = new Promise<void>(resolve => {
    resumeToday = resolve;
  });
  try {
    await emptyArchivePage.route(
      url => url.pathname === '/api/card-pools/daily' && !url.searchParams.has('date'),
      async route => {
        await todayGate;
        await route.continue();
      },
    );
    await emptyArchivePage.goto(`${server.url}?homeMode=today&poolDate=2000-01-01`);
    await expect(
      emptyArchivePage.getByRole('heading', { name: 'No pool for this day.', exact: true }),
    ).toBeVisible();
    await emptyArchivePage.getByRole('link', { name: 'Back to today', exact: true }).click();
    await expect(
      emptyArchivePage.getByRole('status', { name: 'Loading daily pool', exact: true }),
    ).toBeVisible();
    await expect(
      emptyArchivePage.getByRole('heading', { name: 'No pool for this day.', exact: true }),
    ).toHaveCount(0);
    resumeToday();
    await expect(
      emptyArchivePage.getByRole('heading', { name: 'Daily sealed pool', exact: true }),
    ).toBeVisible();
  } finally {
    resumeToday();
    await emptyArchivePage.close();
  }
  // Both deck libraries share the artwork, including two leaders and unfinished drafts.
  deckTableFixture = true;
  signedIn = true;
  await page.setViewportSize({ width: 1500, height: 1200 });
  for (const route of ['decks/public', 'decks/your']) {
    await page.goto(`${server.url}${route}`);
    await expect(page.locator('.deck-artwork')).toHaveCount(5);
    await expect(page.locator('.deck-artwork[data-triple="true"] img')).toHaveCount(3);
    await expect(page.locator('.deck-artwork[data-single="true"] img')).toHaveCount(1);
    await expect(
      page.getByRole('img', { name: 'No leader or base selected', exact: true }),
    ).toBeVisible();
    const partialTwoLeaderDeck = page.locator('.deck-artwork').nth(4);
    await expect(partialTwoLeaderDeck.locator('.compact-deck-card-leader')).toHaveCount(1);
    await expect(partialTwoLeaderDeck.locator('.compact-deck-card-base')).toHaveCount(1);
    const first = page.locator('.deck-artwork').first();
    const leader = (await first.locator('.compact-deck-card-leader').boundingBox())!;
    const base = (await first.locator('.compact-deck-card-base').boundingBox())!;
    expect(leader.x + leader.width).toBeGreaterThan(base.x);
    await expect(
      page.getByRole('link', { name: recentDecks[0]!.deck.name as string, exact: true }),
    ).toHaveAttribute('href', `/decks/${recentDecks[0]!.deck.id}`);
    await page.screenshot({
      path: `${output}/${route.replace('/', '-')}-artwork.png`,
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 390, height: 1400 });
  await expect(page.locator('.deck-artwork')).toHaveCount(5);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `${output}/your-decks-mobile-artwork.png`, fullPage: true });
  expect(errors).toEqual([]);
  console.log(`Today browser checks passed. Screenshots: ${output}`);
} finally {
  await browser.close();
  await server.stop(true);
}
