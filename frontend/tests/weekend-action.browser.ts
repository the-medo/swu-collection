// Build first. Uses isolated HTTP fixtures, with no database or external effects.
import { chromium, expect as baseExpect } from 'playwright/test';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

if (process.env.WEEKEND_ACTION_BROWSER_TEST !== '1')
  throw new Error('Enable WEEKEND_ACTION_BROWSER_TEST=1.');
const dist = resolve(import.meta.dir, '../dist');
const output = resolve(import.meta.dir, '../../.swubase/weekend-action');
await mkdir(output, { recursive: true });
const tournaments = ['finished', 'running', 'running', 'upcoming', 'unknown'].map((status, i) => ({
  tournament: { id: `tournament-${i}`, name: `Qualifier ${i}` },
  weekendTournament: { status },
}));
const resources = [
  {
    id: 'pending',
    tournamentId: 'tournament-1',
    approved: false,
    resourceUrl: 'https://youtu.be/pending0000',
  },
  {
    id: 'invalid',
    tournamentId: 'tournament-1',
    approved: true,
    resourceUrl: 'https://example.com/not-youtube',
  },
  {
    id: 'replay',
    tournamentId: 'tournament-0',
    approved: true,
    resourceUrl: 'https://youtu.be/replay00000',
  },
  {
    id: 'live-stream',
    tournamentId: 'tournament-1',
    approved: true,
    resourceUrl: 'https://youtu.be/abcdefghijk',
  },
].map(resource => ({ ...resource, resourceType: 'stream', title: 'Feature match coverage' }));
let state: 'ready' | 'old' | 'future' | 'empty' | 'error' = 'ready';
let showStreams = true;
let liveRequests = 0;
let thumbnailFails = false;
const detail = {
  weekend: {
    id: 'weekend-fixture',
    date: '2026-10-10',
    name: 'October qualifiers',
    isLive: true,
    tournamentsRunning: 2,
    tournamentsFinished: 1,
    tournamentsUpcoming: 1,
    tournamentsUnknown: 1,
  },
  tournaments,
  resources,
  tournamentGroups: [],
  watchlist: [],
  watchedPlayers: [],
  watchedPlayerDisplayNames: [],
};
const server = Bun.serve({
  hostname: '127.0.0.1',
  port: 0,
  async fetch(request) {
    const { pathname } = new URL(request.url);
    if (pathname === '/api/auth/get-session') return Response.json(null);
    if (pathname === '/api/application-configuration')
      return Response.json({ homepageMode: 'today' });
    if (pathname === '/api/user-settings') return Response.json({});
    if (pathname === '/api/tournament-weekends/live') {
      liveRequests++;
      if (state === 'error') return Response.json({ message: 'Fixture error' }, { status: 503 });
      return Response.json({
        data:
          state === 'empty'
            ? null
            : {
                ...detail,
                weekend: {
                  ...detail.weekend,
                  date:
                    state === 'old'
                      ? '2026-10-03'
                      : state === 'future'
                        ? '2026-10-17'
                        : detail.weekend.date,
                },
                resources: showStreams ? resources : [],
              },
        meta: { generatedAt: '2026-10-10T12:00:00Z', version: 1 },
      });
    }
    if (pathname === '/api/card-pools/daily')
      return Response.json({
        data: {
          date: '2026-10-10',
          today: '2026-10-10',
          nextRefreshAt: '2026-10-11T00:00:00Z',
          availableDates: [],
          pool: null,
        },
      });
    if (pathname === '/api/cards')
      return Response.json({
        official: { needsUpdate: false },
        preview: { needsUpdate: false },
        karabast_unimplemented: {},
      });
    if (pathname.startsWith('/api/')) return Response.json({ data: [] });
    const path = resolve(dist, `.${pathname}`);
    if (path.startsWith(dist + '/') && (await Bun.file(path).exists()))
      return new Response(Bun.file(path));
    return new Response(Bun.file(resolve(dist, 'index.html')));
  },
});
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1500, height: 1000 },
  timezoneId: 'America/Los_Angeles',
});
await context.addInitScript(() => {
  localStorage.setItem('cookie-consent', 'true');
  localStorage.setItem('vite-ui-theme', 'light');
});
await context.route('https://images.swubase.com/**', route =>
  route.fulfill({
    contentType: 'image/svg+xml',
    body: '<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000"><rect width="1600" height="1000" fill="#28474e"/></svg>',
  }),
);
await context.route('https://i.ytimg.com/**', route =>
  thumbnailFails
    ? route.abort()
    : route.fulfill({
        contentType: 'image/svg+xml',
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect width="320" height="180" fill="#54745b"/></svg>',
      }),
);
const page = await context.newPage();
const errors: string[] = [];
page.on('pageerror', error => errors.push(error.message));
const expect = baseExpect.configure({ timeout: 15_000 });
const panel = page.getByRole('region', { name: 'Weekend action', exact: true });
const menu = page.getByRole('radio', { name: 'Live Weekend', exact: true });
const openToday = async () => {
  await page.goto(`${server.url}?homeMode=today`);
  await expect(page.getByRole('region', { name: 'What others are brewing' })).toBeVisible();
};
try {
  // Friday in the visitor's timezone remains a weekday, even when UTC is Saturday.
  await page.clock.install({ time: new Date('2026-10-09T20:00:00-07:00') });
  await openToday();
  await expect(panel).toHaveCount(0);
  await expect(menu).not.toHaveAttribute('data-weekend', 'true');
  expect(liveRequests).toBe(0);
  // The open page crosses midnight without navigation.
  await page.clock.fastForward(4 * 60 * 60 * 1000 + 500);
  await expect(panel).toContainText('5 tournaments this weekend.');
  await expect(menu).toHaveCSS('animation-name', 'homepage-weekend-glow');
  await menu.hover();
  await expect(menu).toHaveCSS('border-color', 'rgb(38, 113, 68)');
  await page.mouse.move(0, 0);
  await expect(panel).toContainText('2 live now');
  await expect(panel).toContainText('1 upcoming');
  await expect(panel).toContainText('1 finished');
  await expect(panel).toContainText('1 awaiting updates');
  await expect(panel.locator('img')).toHaveAttribute(
    'src',
    'https://i.ytimg.com/vi/abcdefghijk/mqdefault.jpg',
  );
  await expect(panel.getByRole('link', { name: 'Watch Qualifier 1 coverage' })).toHaveAttribute(
    'href',
    '/?homeMode=live&streamId=live-stream',
  );
  await expect(panel.locator('iframe')).toHaveCount(0);
  const panelBox = (await panel.boundingBox())!;
  const communityBox = (await page.locator('.today-brewing').boundingBox())!;
  expect(panelBox.y + panelBox.height).toBeLessThan(communityBox.y);
  expect(panelBox.x).toBe(communityBox.x);
  expect(panelBox.width).toBe(communityBox.width);
  await panel.getByRole('link', { name: 'Go to Live Weekend' }).focus();
  await expect(panel.getByRole('link', { name: 'Go to Live Weekend' })).toBeFocused();
  // Reduced motion retains the green emphasis without animation.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(menu).toHaveCSS('animation-name', 'none');
  await expect(menu).toHaveCSS('color', 'rgb(38, 113, 68)');
  for (const width of [1500, 1100, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(await panel.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    await page.screenshot({ path: `${output}/weekend-${width}.png`, fullPage: true });
  }
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await expect(menu).toHaveCSS('color', 'rgb(151, 223, 175)');
  await page.screenshot({ path: `${output}/weekend-dark-320.png`, fullPage: true });
  // Missing/failed thumbnails don't break the coverage link or status summary.
  thumbnailFails = true;
  await openToday();
  await expect(panel.locator('img')).toHaveCount(0);
  await expect(panel.getByRole('link', { name: 'Watch Qualifier 1 coverage' })).toBeVisible();
  showStreams = false;
  await openToday();
  await expect(panel).toContainText('5 tournaments this weekend.');
  await expect(panel.locator('.today-weekend-video')).toHaveCount(0);
  showStreams = true;
  // Refetch the small summary while staying on Today, including signed-out users.
  const beforePoll = liveRequests;
  await page.clock.fastForward(60_500);
  await expect.poll(() => liveRequests).toBeGreaterThan(beforePoll);
  await expect(panel.getByRole('link', { name: 'Watch Qualifier 1 coverage' })).toBeVisible();
  // A stale or future live selection must not supply this weekend's counts or stream.
  for (const selection of ['old', 'future'] as const) {
    state = selection;
    await openToday();
    await expect(panel).toContainText('Oct 10–Oct 11');
    await expect(panel).toContainText('Coverage for this weekend is on its way.');
    await expect(panel).not.toContainText('5 tournaments');
    await expect(panel.locator('img')).toHaveCount(0);
    await expect(panel.getByRole('link', { name: 'Watch Qualifier 1 coverage' })).toHaveCount(0);
  }
  // Selecting the current weekend restores the summary on the next refresh.
  state = 'ready';
  await page.clock.fastForward(60_500);
  await expect(panel).toContainText('5 tournaments this weekend.');
  await expect(panel.getByRole('link', { name: 'Watch Qualifier 1 coverage' })).toBeVisible();
  state = 'empty';
  await openToday();
  await expect(panel).toContainText('Coverage for this weekend is on its way.');
  await expect(panel).not.toContainText('live now');
  await expect(panel.locator('img')).toHaveCount(0);
  // Loading and retry states remain local to the weekend panel.
  state = 'ready';
  let release!: () => void;
  const gate = new Promise<void>(resolve => {
    release = resolve;
  });
  await page.route('**/api/tournament-weekends/live', async route => {
    await gate;
    await route.continue();
  });
  await openToday();
  await expect(panel.getByRole('status', { name: 'Loading weekend action' })).toBeVisible();
  release();
  await expect(panel).toContainText('5 tournaments this weekend.');
  await page.unroute('**/api/tournament-weekends/live');
  state = 'error';
  await openToday();
  await page.clock.fastForward(30_000);
  await expect(panel.getByRole('button', { name: 'Try again' })).toBeVisible();
  state = 'ready';
  await panel.getByRole('button', { name: 'Try again' }).click();
  await expect(panel).toContainText('5 tournaments this weekend.');
  // A sleeping tab resumes on Sunday; the following local Monday removes both cues.
  await page.clock.setSystemTime(new Date('2026-10-11T23:59:59-07:00'));
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(menu).toHaveAttribute('data-weekend', 'true');
  await expect(panel).toContainText('5 tournaments this weekend.');
  await page.clock.fastForward(2000);
  await expect(panel).toHaveCount(0);
  await expect(menu).not.toHaveAttribute('data-weekend', 'true');
  const weekdayRequests = liveRequests;
  await page.clock.fastForward(60_500);
  expect(liveRequests).toBe(weekdayRequests);
  // The CTA clears an archive date and opens the normal Live Weekend page.
  await page.clock.setSystemTime(new Date('2026-10-11T12:00:00-07:00'));
  state = 'empty';
  await page.goto(`${server.url}?homeMode=today&poolDate=2026-10-09`);
  await panel.getByRole('link', { name: 'Go to Live Weekend' }).click();
  expect(new URL(page.url()).search).toBe('?homeMode=live');
  await expect(menu).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByRole('heading', { name: 'Between weekends.' })).toBeVisible();
  expect(errors).toEqual([]);
  console.log(
    'Weekend action passed: local calendar transitions, polling, current-weekend filtering, approved thumbnails, links, states, reduced motion and responsive themes.',
  );
} finally {
  await browser.close();
  server.stop(true);
}
