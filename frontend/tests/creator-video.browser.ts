// Read-only browser regression against a running development frontend:
// CREATOR_VIDEO_BROWSER_ORIGIN=https://your-worktree bun frontend/tests/creator-video.browser.ts
// YouTube, creation and deck responses are fixtures; no media playback or database writes.
import { chromium, expect } from 'playwright/test';
import type { Creation } from '../../shared/creators/contracts.ts';

const origin = process.env.CREATOR_VIDEO_BROWSER_ORIGIN;
if (!origin) throw new Error('Set CREATOR_VIDEO_BROWSER_ORIGIN to your development frontend.');
const id = '10000000-0000-4000-8000-000000000001';
const sourceDeckId = 'caaaaaaaaaaaaaaaaaaaaaaaa';
const originalDeckUrl = `https://swuforge.com/decks/${sourceDeckId}`;
const creation: Creation = {
  id,
  creatorId: 'video-test',
  authorId: null,
  revision: 1,
  sourceVerified: true,
  publishedAt: '2026-10-12T12:00:00Z',
  updatedAt: '2026-10-12T12:00:00Z',
  creator: { slug: 'video-test', name: 'Video test creator', avatarUrl: '' },
  references: [
    {
      type: 'deck',
      id: '10000000-0000-4000-8000-000000000002',
      startSeconds: 300,
      label: 'Kenobi Yellow by Fixture builder',
      href: '/decks/10000000-0000-4000-8000-000000000002',
    },
    {
      type: 'leader',
      id: 'obi-wan-kenobi--courage-makes-heroes',
      startSeconds: 165,
      label: 'Obi-Wan Kenobi, Courage Makes Heroes — Courage Makes Heroes',
      href: '/cards/detail/obi-wan-kenobi--courage-makes-heroes',
    },
  ],
  document: {
    title: 'A guide to Obi Yellow',
    summary: `A deck guide with chapters.\n\nDecklist: (${originalDeckUrl}).\nMore: www.example.com/path?ref=swu&set=hmw!\nCard: https://example.com/cards/Obi_(leader).\nSubdomain: sub.www.example.com\nEmail: hello@www.site.com\nInternational hostname: ñwww.site.com\njavascript:alert(1) <img src=x onerror=alert(1)>\n0:00 Intro\n0:55 Decklist`,
    videoDescription: '',
    medium: 'video',
    body: {
      version: 1,
      blocks: [{ id: 'paragraph', type: 'paragraph', props: {}, content: [], children: [] }],
    },
    coverUrl: '',
    sourceUrl: 'https://www.youtube.com/watch?v=abcdefghijk',
    language: 'en',
    tags: [],
    references: [],
    chapters: [
      { title: 'Intro', startSeconds: 0 },
      { title: 'Decklist', startSeconds: 55 },
      { title: 'Sideboard', startSeconds: 1064 },
    ],
    relevance: 'primary',
    freshness: 'current',
    season: '',
    sponsorship: '',
    series: '',
    seriesOrder: 0,
    pinned: false,
  },
};

creation.document.videoDescription =
  creation.document.summary +
  '\n\n' +
  'Extended description. '.repeat(60) +
  '\nhttps://swuforge.com/decks/end-of-description';
creation.document.summary = 'A short card summary.';

// Simulate the documented IFrame API boundary. Readiness is deliberately manual
// so chapter clicks while YouTube loads and events after disposal are exercised.
const apiFixture = `
window.testPlayers = [];
window.YT = { Player: class {
  constructor(frame, options) {
    this.frame = frame;
    this.events = options.events;
    this.calls = [];
    this.destroyed = false;
    window.testPlayers.push(this);
  }
  ready() { this.events.onReady({target: this}); }
  seekTo(seconds, allowSeekAhead) { this.calls.push(['seek', seconds, allowSeekAhead]); }
  playVideo() { this.calls.push(['play']); }
  destroy() { this.destroyed = true; this.frame.remove(); }
}};
window.onYouTubeIframeAPIReady?.();
`;
declare global {
  interface Window {
    testPlayers: {
      frame: HTMLIFrameElement;
      ready(): void;
      calls: (string | number | boolean)[][];
      destroyed: boolean;
    }[];
  }
}

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1200 } });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addLocatorHandler(page.getByRole('button', { name: 'Dismiss', exact: true }), () =>
    page.getByRole('button', { name: 'Dismiss', exact: true }).click(),
  );
  await page.route(`**/api/creator-hub/creations/${id}`, route =>
    route.fulfill({ json: { data: creation } }),
  );
  await page.route('**/api/deck/10000000-0000-4000-8000-000000000002', route =>
    route.fulfill({
      json: {
        deck: {
          id: '10000000-0000-4000-8000-000000000002',
          leaderCardId1: 'obi-wan-kenobi--courage-makes-heroes',
          leaderCardId2: null,
          baseCardId: 'crystal-caves',
          public: 1,
        },
        importSource: {
          source: 'swuforge',
          sourceDeckId,
        },
      },
    }),
  );
  await page.route('https://www.youtube-nocookie.com/embed/**', route =>
    route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><title>YouTube test player</title><button>Play</button>',
    }),
  );
  await page.route('https://www.youtube.com/iframe_api', route =>
    route.fulfill({ contentType: 'text/javascript', body: apiFixture }),
  );
  await page.goto(`${origin}/content/${id}`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: creation.document.title })).toBeVisible();
  const frame = page.locator('article iframe');
  await expect(frame).toHaveCount(1, { timeout: 5000 });
  await expect(page.getByRole('button', { name: 'Play on YouTube', exact: true })).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => window.testPlayers?.length)).toBe(1);
  expect(await page.evaluate(() => window.testPlayers[0].calls)).toEqual([]);
  const originalFrame = await frame.elementHandle();

  // A click before readiness is retained, and a later click supersedes it.
  await page.getByRole('link', { name: /Decklist/ }).click();
  await page.getByRole('link', { name: /Sideboard/ }).click();
  await page.evaluate(() => window.testPlayers[0].ready());
  expect(await page.evaluate(() => window.testPlayers[0].calls)).toEqual([
    ['seek', 1064, true],
    ['play'],
  ]);
  // Repeated clicks, including zero and keyboard activation, seek and play the
  // existing browsing context instead of reloading an embed with a new start URL.
  await page.getByRole('link', { name: /Intro/ }).click();
  await page.getByRole('link', { name: /Intro/ }).press('Enter');
  await page.getByRole('link', { name: /Decklist/ }).click();
  expect(await originalFrame!.evaluate(el => el.isConnected)).toBe(true);
  expect(await page.evaluate(() => window.testPlayers[0].calls)).toEqual([
    ['seek', 1064, true],
    ['play'],
    ['seek', 0, true],
    ['play'],
    ['seek', 0, true],
    ['play'],
    ['seek', 55, true],
    ['play'],
  ]);
  await page.getByRole('link', { name: /Play from 2:45: Obi-Wan/ }).click();
  expect(await page.evaluate(() => window.testPlayers[0].calls.slice(-2))).toEqual([
    ['seek', 165, true],
    ['play'],
  ]);
  expect(await originalFrame!.evaluate(el => el.isConnected)).toBe(true);

  await page.getByRole('link', { name: /Play from 5:00: Kenobi Yellow/ }).click();
  expect(await page.evaluate(() => window.testPlayers[0].calls.slice(-2))).toEqual([
    ['seek', 300, true],
    ['play'],
  ]);

  const article = (await page.locator('article').boundingBox())!;
  const main = (await page.getByRole('main').boundingBox())!;
  expect(article.width).toBeGreaterThan(main.width - 80);
  const video = (await frame.boundingBox())!;
  const decklists = page.getByRole('region', { name: 'Decklists', exact: true });
  const deckLink = page.getByRole('link', {
    name: 'Open decklist: Kenobi Yellow by Fixture builder',
    exact: true,
  });
  await expect(deckLink).toHaveCount(1);
  const artwork = deckLink.getByRole('img', { name: /Obi-Wan Kenobi.*Crystal Caves/ });
  await expect(artwork).toBeVisible();
  await expect(artwork.locator('img')).toHaveCount(2);
  await expect(
    decklists.getByRole('link', {
      name: 'Open decklist: Kenobi Yellow by Fixture builder',
      exact: true,
    }),
  ).toHaveAttribute('href', '/decks/10000000-0000-4000-8000-000000000002');
  const originalDeck = decklists.getByRole('link', { name: 'Original SWU Forge link' });
  await expect(originalDeck).toHaveAttribute('href', originalDeckUrl);
  await expect(originalDeck).toHaveAttribute('target', '_blank');
  await expect(originalDeck).toHaveAttribute('rel', 'noopener noreferrer');
  const copyBox = (await deckLink.boundingBox())!;
  expect((await originalDeck.boundingBox())!.y).toBeGreaterThanOrEqual(copyBox.y + copyBox.height);
  const decksBox = (await decklists.boundingBox())!;
  expect(decksBox.x).toBeGreaterThanOrEqual(video.x + video.width);
  expect(Math.abs(decksBox.y - video.y)).toBeLessThan(3);
  const chapters = (await page.getByRole('navigation', { name: 'Chapters' }).boundingBox())!;
  expect(chapters.x).toBeGreaterThanOrEqual(video.x + video.width);
  expect(chapters.y).toBeGreaterThanOrEqual(decksBox.y + decksBox.height);
  const chapterLinks = page.getByRole('navigation', { name: 'Chapters' }).getByRole('link');
  const firstChapter = (await chapterLinks.nth(0).boundingBox())!;
  const secondChapter = (await chapterLinks.nth(1).boundingBox())!;
  expect(firstChapter.height).toBeGreaterThanOrEqual(24);
  expect(secondChapter.y - firstChapter.y).toBeLessThanOrEqual(28);

  const description = page.getByRole('region', { name: 'Video description' });
  expect(await description.locator('p').textContent()).toBe(creation.document.videoDescription);
  await expect(description.locator('p')).toHaveCSS('white-space', 'pre-wrap');
  await expect(description.getByRole('link')).toHaveCount(4);
  await expect(
    description.getByRole('link', { name: originalDeckUrl, exact: true }),
  ).toHaveAttribute('href', originalDeckUrl);
  await expect(
    description.getByRole('link', { name: 'www.example.com/path?ref=swu&set=hmw' }),
  ).toHaveAttribute('href', 'https://www.example.com/path?ref=swu&set=hmw');
  await expect(
    description.getByRole('link', { name: 'https://example.com/cards/Obi_(leader)' }),
  ).toHaveAttribute('href', 'https://example.com/cards/Obi_(leader)');
  await expect(
    description.getByRole('link', { name: 'https://swuforge.com/decks/end-of-description' }),
  ).toHaveAttribute('href', 'https://swuforge.com/decks/end-of-description');
  await expect(description.locator('img')).toHaveCount(0);
  for (const link of await description.getByRole('link').all()) {
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  }
  expect(await page.locator('article > header').textContent()).not.toContain(
    creation.document.summary,
  );
  const descriptionBox = (await description.boundingBox())!;
  expect(descriptionBox.y).toBeGreaterThanOrEqual(video.y + video.height);
  expect(Math.abs(descriptionBox.x - video.x)).toBeLessThan(3);
  expect(Math.abs(descriptionBox.width - video.width)).toBeLessThan(3);

  await page.setViewportSize({ width: 390, height: 844 });
  const mobileVideo = (await frame.boundingBox())!;
  const mobileDecks = (await decklists.boundingBox())!;
  const mobileDescription = (await description.boundingBox())!;
  expect(mobileDescription.y).toBeGreaterThanOrEqual(mobileVideo.y + mobileVideo.height);
  expect(mobileDecks.y).toBeGreaterThanOrEqual(mobileDescription.y + mobileDescription.height);
  const mobileChapters = (await page.getByRole('navigation', { name: 'Chapters' }).boundingBox())!;
  expect(mobileChapters.y).toBeGreaterThanOrEqual(mobileVideo.y + mobileVideo.height);
  expect(
    await page.locator('[data-creator-layout]').evaluate(el => el.scrollWidth <= el.clientWidth),
  ).toBe(true);

  // Route disposal releases the player; late callbacks must not resume it.
  await page.getByRole('link', { name: '← Discover content', exact: true }).click();
  await expect(frame).toHaveCount(0);
  expect(await page.evaluate(() => window.testPlayers[0].destroyed)).toBe(true);
  await page.evaluate(() => window.testPlayers[0].ready());
  await page.goBack({ waitUntil: 'domcontentloaded' });
  await expect(frame).toHaveCount(1);
  await expect.poll(() => page.evaluate(() => window.testPlayers.length)).toBe(2);
  await page.evaluate(() => window.testPlayers[1].ready());
  expect(await page.evaluate(() => window.testPlayers[1].calls)).toEqual([]);
  expect(errors).toEqual([]);

  // A loaded API with an unresponsive iframe also falls back. Late readiness
  // restores controls without replaying a stale click from before the timeout.
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect.poll(() => page.evaluate(() => window.testPlayers?.length)).toBe(1);
  await page.getByRole('link', { name: /Decklist/ }).click();
  await expect(page.getByText(/Timestamps now open on YouTube/)).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('link', { name: /Decklist/ })).toBeFocused();
  await expect(page.getByRole('link', { name: /Decklist/ })).toHaveAttribute(
    'href',
    'https://www.youtube.com/watch?v=abcdefghijk&t=55s',
  );
  await page.evaluate(() => window.testPlayers[0].ready());
  await expect(page.getByRole('link', { name: /Decklist/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Decklist/ })).toBeFocused();
  expect(await page.evaluate(() => window.testPlayers[0].calls)).toEqual([]);

  // Even if the API script is blocked, retain native playback and original URL.
  await page.route('https://www.youtube.com/iframe_api', route => route.abort());
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(frame).toHaveCount(1);
  await expect(page.getByText(/Timestamps now open on YouTube/)).toBeVisible();
  await expect(page.getByRole('link', { name: /Decklist/ })).toHaveAttribute(
    'href',
    'https://www.youtube.com/watch?v=abcdefghijk&t=55s',
  );
  await expect(
    page.getByRole('link', { name: /Open on YouTube at 2:45: Obi-Wan/ }),
  ).toHaveAttribute('href', 'https://www.youtube.com/watch?v=abcdefghijk&t=165s');
  await expect(
    page.getByRole('link', { name: /Open on YouTube at 5:00: Kenobi Yellow/ }),
  ).toHaveAttribute('href', 'https://www.youtube.com/watch?v=abcdefghijk&t=300s');
  await expect(
    page.getByRole('link', { name: 'Open original content', exact: true }),
  ).toHaveAttribute('href', creation.document.sourceUrl);

  // Linked decks stay discoverable even when the video has no chapters.
  creation.document.chapters = [];
  await page.setViewportSize({ width: 1920, height: 1200 });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(deckLink).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Chapters' })).toHaveCount(0);
  const videoWithoutChapters = (await frame.boundingBox())!;
  const decksWithoutChapters = (await decklists.boundingBox())!;
  expect(decksWithoutChapters.x).toBeGreaterThanOrEqual(
    videoWithoutChapters.x + videoWithoutChapters.width,
  );

  // Missing deck metadata must not prevent following the existing deck link.
  await page.route('**/api/deck/10000000-0000-4000-8000-000000000002', route =>
    route.fulfill({ status: 404, json: { message: 'Deck not found' } }),
  );
  const missingDeck = page.waitForResponse(
    response =>
      response.url().endsWith('/api/deck/10000000-0000-4000-8000-000000000002') &&
      response.status() === 404,
  );
  await page.reload({ waitUntil: 'domcontentloaded' });
  await missingDeck;
  await expect(deckLink).toBeVisible();
  await expect(deckLink).toHaveAttribute('href', '/decks/10000000-0000-4000-8000-000000000002');
  await expect(artwork).toHaveCount(0);
  await expect(originalDeck).toHaveCount(0);

  // Hand-authored videos may intentionally use only the summary.
  creation.document.videoDescription = '';

  // A video without timestamps needs only the native embed, even if the API is blocked.
  creation.references = [];
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(frame).toHaveCount(1);
  await expect(page.getByRole('navigation', { name: 'Chapters' })).toHaveCount(0);
  await expect(decklists).toHaveCount(0);
  await expect(description.locator('p')).toHaveText(creation.document.summary);
  await expect(page.getByText(/Timestamps now open on YouTube/)).toHaveCount(0);
  await expect(page.locator('script[src="https://www.youtube.com/iframe_api"]')).toHaveCount(0);
  console.log(
    'Creator video playback, readiness, cleanup, fallback, and responsive layout passed.',
  );
} finally {
  await browser.close();
}
