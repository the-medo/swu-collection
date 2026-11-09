// Build first, then: CARD_PERCENTAGE_BROWSER_TEST=1 bun frontend/tests/card-deck-percentage.browser.ts
// Local synthetic API only; no database or external services.
import { chromium, expect as baseExpect } from 'playwright/test';
import { resolve } from 'node:path';
import { mkdir } from 'node:fs/promises';

if (process.env.CARD_PERCENTAGE_BROWSER_TEST !== '1')
  throw new Error('Enable CARD_PERCENTAGE_BROWSER_TEST=1.');
const root = resolve(import.meta.dir, '../..');
const cards = await Bun.file(`${root}/server/db/json/card-list.json`).json();
const ids = ['11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222'];
const groupIds = ['33333333-3333-4333-8333-333333333333', '44444444-4444-4444-8444-444444444444'];
const leader = 'director-krennic--amidst-my-achievement';
const secondLeader = 'doctor-hemlock--emotion-has-no-place-here';
const cardId = 'battlefield-marine';
const stamp = '2025-01-01T00:00:00.000Z';
const meta = {
  id: 99,
  name: 'Percentage fixture',
  set: 'sor',
  format: 1,
  date: '2025-01-01',
  season: 1,
};
const metaData = { meta, format: { id: 1, name: 'Premier', description: '' } };
const tournaments = ids.map((id, index) => ({
  tournament: {
    id,
    userId: 'fixture',
    name: `Percentage event ${index + 1}`,
    type: 'pq',
    format: 1,
    attendance: 100,
    imported: true,
    meta: 99,
    days: 1,
    location: 'FR',
    continent: 'Europe',
    date: stamp,
    createdAt: stamp,
    updatedAt: stamp,
    bracketInfo: 'none',
    meleeId: null,
  },
  tournamentType: { id: 'pq', name: 'Planetary Qualifier', sortValue: 200, major: 1 },
  meta,
}));
const decks = ids.map((id, event) =>
  Array.from({ length: 6 }, (_, index) => ({
    tournamentDeck: {
      tournamentId: id,
      deckId: `deck-${event}-${index}`,
      placement: index + 1,
      recordWin: 2,
      recordLose: 1,
      recordDraw: 0,
      points: 6,
      meleePlayerUsername: 'Fixture',
    },
    deck: {
      id: `deck-${event}-${index}`,
      name: 'Fixture deck',
      format: 1,
      leaderCardId1: !event && index === 4 ? null : index < (event ? 4 : 3) ? leader : secondLeader,
      leaderCardId2: null,
      baseCardId:
        !event && index === 5
          ? null
          : !event && index === 2
            ? 'energy-conversion-lab'
            : index % 2
              ? 'command-center'
              : 'echo-base',
    },
    deckInformation: { baseAspect: 'Command', aspectCommand: 1 },
  })),
);
const groups = groupIds.map((id, index) => ({
  group: {
    id,
    name: `PQ Week ${index + 1}`,
    metaId: 99,
    position: index,
    description: 'Fixture',
    visible: false,
  },
  meta,
  tournaments: [tournaments[index]],
}));
const stat = (deckCount: number) => ({
  cardId,
  deckCount,
  countMd: deckCount * 2,
  countSb: deckCount,
  matchWin: 4,
  matchLose: 2,
});
let snapshotTotal: number | undefined = 20;
let releaseDecks: (() => void) | undefined;
let blockedDecks: Promise<void> | undefined;
let metaCountFailure = false;
let deckLoadFailure = false;
let bulkLoadFailure = false;
const requests: string[] = [];
function snapshot() {
  return {
    data: {
      dailySnapshot: { date: '2025-01-01', tournamentGroupId: groupIds[0], updatedAt: stamp },
      sections: [
        {
          date: '2025-01-01',
          section: 'most-played-cards',
          updatedAt: stamp,
          data: JSON.stringify({
            id: 'most-played-cards',
            title: 'Cards in most decks',
            data: {
              tournamentGroupId: groupIds[0],
              dataPoints: [stat(1)],
              tournamentGroupExt:
                snapshotTotal === undefined
                  ? null
                  : {
                      tournamentGroup: groups[0].group,
                      tournamentGroupStats: {
                        totalDecks: snapshotTotal,
                        attendance: 100,
                        totalTournaments: 1,
                        importedTournaments: 1,
                        tournamentsWithData: 1,
                      },
                    },
            },
          }),
        },
      ],
    },
  };
}
const server = Bun.serve({
  hostname: '127.0.0.1',
  port: 0,
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;
    if (path.startsWith('/api/')) {
      requests.push(path + url.search);
      if (path === '/api/auth/get-session') return Response.json(null);
      if (path === '/api/application-configuration')
        return Response.json({ homepageMode: 'snapshot' });
      if (path === '/api/user-settings') return Response.json({});
      if (path === '/api/creator-hub/creations') return Response.json({ items: [] });
      if (path === '/api/cards')
        return Response.json({
          official: { needsUpdate: true, lastUpdated: 'fixture', cards },
          preview: { needsUpdate: false },
          karabast_unimplemented: {},
        });
      if (path === '/api/daily-snapshot') return Response.json(snapshot());
      if (path === '/api/tournament-weekends/live') return Response.json({ data: null });
      if (path === '/api/world/countries') return Response.json({ countries: {} });
      for (const [index, id] of ids.entries()) {
        if (path === `/api/tournament/${id}`)
          return Response.json({ ...tournaments[index], decks: decks[index] });
        if (path === `/api/tournament/${id}/decks`) {
          if (deckLoadFailure) return Response.json({ message: 'Fixture error' }, { status: 500 });
          if (blockedDecks) await blockedDecks;
          return Response.json({ data: decks[index] });
        }
        if (path === `/api/tournament/${id}/matches`) return Response.json({ data: [] });
      }
      if (path === '/api/tournament/bulk/data') {
        if (bulkLoadFailure) return Response.json({ message: 'Fixture error' }, { status: 500 });
        const body = (await request.json()) as { ids: string[] };
        return Response.json({
          decks: Object.fromEntries(body.ids.map(id => [id, decks[ids.indexOf(id)]])),
          matches: Object.fromEntries(body.ids.map(id => [id, []])),
        });
      }
      if (path === '/api/tournament')
        return Response.json({
          data: [tournaments[0]],
          pagination: { hasMore: false, offset: 0, limit: 250 },
        });
      if (path === '/api/meta')
        return Response.json({ data: [metaData], pagination: { hasMore: false } });
      if (path === '/api/meta/99') return Response.json({ data: metaData });
      if (path === '/api/tournament-groups')
        return Response.json({ data: groups, pagination: { hasMore: false } });
      for (const [index, id] of groupIds.entries())
        if (path === `/api/tournament-groups/${id}`) return Response.json({ data: groups[index] });
      if (path === '/api/card-stats/deck-counts') {
        if (metaCountFailure) return Response.json({ message: 'Fixture error' }, { status: 500 });
        return Response.json({
          data: {
            totalDeckCount: 10,
            byLeader: { [leader]: 7, [secondLeader]: 3 },
            byLeaderBase: {
              [`${leader}|Command`]: 6,
              [`${leader}|energy-conversion-lab`]: 1,
              [`${secondLeader}|Command`]: 3,
            },
          },
        });
      }
      if (path === '/api/card-stats' || path === '/api/card-stats/top-played') {
        const group = url.searchParams.get('tournament_group_id');
        const tournament = url.searchParams.get('tournament_id');
        const count = group
          ? group === groupIds[0]
            ? 1
            : 2
          : tournament
            ? tournament === ids[0]
              ? 1
              : 2
            : 3;
        if (path.endsWith('/top-played')) {
          const keys = (
            url.searchParams.get('leader_base_pairs') ??
            url.searchParams.get('leader_ids') ??
            ''
          ).split(',');
          return Response.json({
            data: Object.fromEntries(
              keys.map(key => [
                key,
                key === leader || key === `${leader}|Command` ? [stat(count)] : [],
              ]),
            ),
          });
        }
        return Response.json({ data: [stat(count)] });
      }
      return Response.json({ data: [], pagination: { hasMore: false } });
    }
    const file = resolve(root, 'frontend/dist', `.${path}`);
    if (file.startsWith(`${root}/frontend/dist/`) && (await Bun.file(file).exists()))
      return new Response(Bun.file(file));
    return new Response(Bun.file(`${root}/frontend/dist/index.html`));
  },
});
const browser = await chromium.launch();
const expect = baseExpect.configure({ timeout: 15_000 });
const errors: string[] = [];
const output = resolve(root, '.swubase/card-deck-percentage');
await mkdir(output, { recursive: true });
async function open(path: string, mobile = false) {
  const context = await browser.newContext({
    viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 },
    reducedMotion: 'reduce',
  });
  await context.addInitScript(() => {
    localStorage.setItem('cookie-consent', 'true');
    localStorage.setItem('vite-ui-theme', 'light');
  });
  await context.route('https://**', route => route.abort());
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(new URL(path, server.url).href);
  return { context, page };
}
try {
  // Direct entry uses loaded summaries, not attendance, and waits for the loader.
  blockedDecks = new Promise<void>(resolve => {
    releaseDecks = resolve;
  });
  const direct = await open(`/tournaments/${ids[0]}/card-stats`);
  await expect(direct.page.getByText('Deck count:', { exact: true })).toBeVisible();
  await expect(direct.page.getByText('Included in:', { exact: true })).toHaveCount(0);
  releaseDecks!();
  blockedDecks = undefined;
  await expect(direct.page.getByText('25.0%', { exact: true })).toBeVisible();
  await direct.page.getByText('Included in:', { exact: true }).locator('..').focus();
  await expect(direct.page.getByRole('tooltip')).toContainText('1 of 4 known decks');
  await direct.page.keyboard.press('Escape');
  await direct.page.screenshot({ path: resolve(output, 'tournament.png'), fullPage: true });
  await direct.page.getByRole('link', { name: 'Aspect', exact: true }).click();
  await expect(direct.page.getByText('25.0%', { exact: true }).first()).toBeVisible();
  await direct.context.close();

  const grouped = await open(`/tournaments/${ids[0]}/card-stats?csGroupBy=type`);
  await expect(grouped.page.getByText('25.0%', { exact: true })).toBeVisible();
  await grouped.context.close();

  // Full-meta denominator must not come from the page's smaller tournament list.
  const wholeMeta = await open('/meta?metaId=99&page=card-stats');
  await expect(wholeMeta.page.getByText('30.0%', { exact: true })).toBeVisible();
  await wholeMeta.page.getByRole('link', { name: 'Leader', exact: true }).click();
  await expect(wholeMeta.page.getByText('42.9%', { exact: true })).toBeVisible();
  await wholeMeta.page.getByRole('link', { name: 'Leader/Base', exact: true }).click();
  await expect(wholeMeta.page.getByText('50.0%', { exact: true })).toBeVisible();
  const countRequestsBeforeRefresh = requests.filter(url => url.includes('/deck-counts')).length;
  metaCountFailure = true;
  await wholeMeta.page.evaluate(() => {
    const realNow = Date.now;
    Date.now = () => realNow() + 6 * 60 * 1000;
    window.dispatchEvent(new Event('offline'));
    window.dispatchEvent(new Event('online'));
  });
  await expect
    .poll(
      () =>
        requests.filter(url => url.includes('/deck-counts')).length - countRequestsBeforeRefresh,
    )
    .toBeGreaterThanOrEqual(4);
  await wholeMeta.page.evaluate(
    () =>
      new Promise<void>(resolve => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );
  await expect(wholeMeta.page.getByText('50.0%', { exact: true })).toBeVisible();
  metaCountFailure = false;
  await wholeMeta.context.close();

  const group = await open(
    `/meta?maTournamentGroupId=${groupIds[0]}&page=card-stats&csPage=leader`,
  );
  await expect(group.page.getByText('33.3%', { exact: true })).toBeVisible();
  const requestStart = requests.length;
  await group.page.getByRole('combobox').filter({ hasText: 'Week 1' }).click();
  await group.page.getByRole('option', { name: /Week 2/ }).click();
  await expect(group.page.getByText('50.0%', { exact: true })).toBeVisible();
  expect(
    requests
      .slice(requestStart)
      .some(url => url.includes('top-played') && url.includes(groupIds[1])),
  ).toBe(true);
  await group.context.close();

  for (const [view, extra, percentage] of [
    ['all', '', '25.0%'],
    ['leader', `&csLeaderId=${leader}`, '33.3%'],
    ['leader-base', `&csLeaderId=${leader}&csBaseId=Command`, '50.0%'],
  ]) {
    const selected = await open(
      `/meta?maTournamentGroupId=${groupIds[0]}&page=card-stats&csPage=${view}${extra}`,
    );
    await expect(selected.page.getByText(percentage, { exact: true })).toBeVisible();
    if (view === 'leader') {
      // A leader selected on the previous tab is not yet a complete leader/base filter.
      await selected.page.getByRole('link', { name: 'Leader/Base', exact: true }).click();
      await expect(selected.page.getByText('50.0%', { exact: true })).toBeVisible();
    }
    await selected.context.close();
  }

  const inline = await open(`/?maTournamentId=${ids[0]}&page=card-stats`, true);
  await expect(
    inline.page.locator('#section-tournament-detail').getByText('25.0%', { exact: true }),
  ).toBeVisible();
  await inline.page
    .locator('#section-tournament-detail')
    .getByText('25.0%', { exact: true })
    .scrollIntoViewIfNeeded();
  await inline.page.screenshot({
    path: resolve(output, 'homepage-inline-mobile.png'),
    fullPage: true,
  });
  await inline.context.close();

  for (const total of [20, undefined, 0]) {
    snapshotTotal = total;
    const home = await open('/', true);
    await expect(
      home.page.getByRole('region', { name: 'Most played cards', exact: true }),
    ).toBeVisible();
    const section = home.page.locator('#s-most-played-cards');
    if (total) await expect(section.getByText('5.0%', { exact: true })).toBeVisible();
    else await expect(section.getByText('Included in:', { exact: true })).toHaveCount(0);
    await home.context.close();
  }

  metaCountFailure = true;
  const failure = await open('/meta?metaId=99&page=card-stats&csPage=leader');
  await expect(
    failure.page.getByText('Failed to load card statistics', { exact: true }),
  ).toBeVisible();
  await failure.context.close();
  metaCountFailure = false;

  for (const scope of ['tournament', 'group']) {
    deckLoadFailure = scope === 'tournament';
    bulkLoadFailure = scope === 'group';
    const failedLoader = await open(
      scope === 'tournament'
        ? `/tournaments/${ids[0]}/card-stats?csPage=leader`
        : `/meta?maTournamentGroupId=${groupIds[0]}&page=card-stats&csPage=leader-base`,
    );
    await expect(
      failedLoader.page.getByText('Failed to load card statistics', { exact: true }),
    ).toBeVisible();
    deckLoadFailure = false;
    bulkLoadFailure = false;
    // Reconnecting retries the existing query and clears the loader error in the same page.
    await failedLoader.page.evaluate(() => {
      window.dispatchEvent(new Event('offline'));
      window.dispatchEvent(new Event('online'));
    });
    await expect(
      failedLoader.page.getByText(scope === 'tournament' ? '33.3%' : '50.0%', { exact: true }),
    ).toBeVisible();
    await failedLoader.context.close();
  }
  expect(errors).toEqual([]);
  console.log(
    'PASS: tournament, meta, groups/PQ, leader/base, homepage, loading, missing totals, and group cache switching.',
  );
} finally {
  releaseDecks?.();
  await browser.close();
  server.stop(true);
}
