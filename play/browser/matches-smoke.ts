// Real local API/worker acceptance using synthetic accounts and frozen decks.
import { chromium } from 'playwright';
import type { Page } from 'playwright';
import postgres from 'postgres';
import { randomUUID } from 'node:crypto';
import { getCookies } from 'better-auth/cookies';
import { serializeSignedCookie } from 'better-call';
import { mkdir, copyFile } from 'node:fs/promises';
import { CrossfireLobbies } from '../../server/lib/crossfire/lobbies.ts';
import { CrossfireMatches } from '../../server/lib/crossfire/matches.ts';
import { PostgresGameStore } from '../storage/postgres.ts';
import { DurableGame } from '../host/durable-game.ts';
import { encodeArchive } from '../history/archive.ts';
import { ids } from '../testing/helpers.ts';
const url = process.env.CROSSFIRE_TEST_DATABASE_URL,
  origin = process.env.BETTER_AUTH_URL!;
if (
  !url ||
  url !== process.env.DATABASE_URL ||
  new URL(url).hostname !== '127.0.0.1' ||
  !new URL(url).pathname.startsWith('/swubase_')
)
  throw new Error('Explicit local worktree database required');
if (
  !['localhost', '127.0.0.1'].includes(new URL(origin).hostname) &&
  !new URL(origin).hostname.endsWith('.ts.net')
)
  throw new Error('Local origin required');
const sql = postgres(url, { max: 4 }),
  store = new PostgresGameStore(sql),
  catalog = await Bun.file(new URL('../../server/db/json/card-list.json', import.meta.url)).json(),
  lobbies = new CrossfireLobbies(sql, catalog),
  matches = new CrossfireMatches(sql, catalog);
const people = [0, 1].map(n => ({
  userId: `match-browser-${randomUUID()}-${n}`,
  sessionId: randomUUID(),
  token: randomUUID(),
  deckId: randomUUID(),
}));
const principal = (n: number) => ({ userId: people[n]!.userId, sessionId: people[n]!.sessionId });
const browser = await chromium.launch(),
  errors: string[] = [],
  pages: Page[] = [];
const folder = '.swubase/crossfire-gallery',
  served = 'frontend/.swubase/crossfire-gallery';
const assert = (ok: unknown, message: string) => {
  if (!ok) throw new Error(message);
};
const shots: string[] = [];
async function shot(page: Page, name: string) {
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${folder}/${name}.png` });
  await copyFile(`${folder}/${name}.png`, `${served}/${name}.png`);
  shots.push(name);
}
async function finish(lobbyId: string) {
  const lobby = (await lobbies.get(principal(0), lobbyId))!;
  const lease = (await store.claim(lobby.gameId!, 'match-browser-fixture', 60000))!;
  const host = await DurableGame.restore(store, lease, { checkpointEvery: 20, leaseMs: 60000 });
  await host.submit('p1', randomUUID(), {
    type: 'concede',
    gameId: lobby.gameId!,
    playerId: 'p1',
    expectedRevision: host.state.revision,
  });
  await store.publishArchive(
    lobby.gameId!,
    await encodeArchive(await store.readHistory(lobby.gameId!)),
  );
  await store.release(lease);
}
try {
  await mkdir(folder, { recursive: true });
  await mkdir(served, { recursive: true });
  for (const p of people) {
    await sql`INSERT INTO "user"(id,name,email,email_verified,created_at,updated_at,display_name,currency, role) VALUES (${p.userId},'Match fixture',${p.userId + '@invalid.local'},false,now(),now(),${p.userId},'USD', 'crossfire')`;
    await sql`INSERT INTO session(id,token,expires_at,user_id,created_at,updated_at) VALUES (${p.sessionId},${p.token},now()+interval '1 hour',${p.userId},now(),now())`;
    await sql`INSERT INTO deck(id,user_id,name,format,leader_card_id_1,base_card_id) VALUES (${p.deckId},${p.userId},'Crossfire browser match',1,${ids.leader},${ids.base})`;
    await sql`INSERT INTO deck_card(deck_id,card_id,board,quantity) VALUES (${p.deckId},${ids.marine},1,12),(${p.deckId},'open-fire',2,2)`;
  }
  const roots: string[] = [];
  for (const bestOf of [3, 1, 3] as const) {
    const root = await lobbies.create(
      principal(0),
      people[0]!.deckId,
      { allowSpectators: true, handsToPlayers: false, handsToSpectators: false },
      bestOf,
    );
    await lobbies.join(principal(1), root.id, people[1]!.deckId, root.policy, bestOf);
    roots.push(root.id);
    await finish(root.id);
  }
  const ready = {
    kind: 'next' as const,
    ready: true,
    mainboard: [{ cardId: ids.marine, quantity: 12 }],
  };
  await matches.ready(principal(0), roots[2]!, ready);
  const finalGame = (await matches.ready(principal(1), roots[2]!, ready)).currentLobbyId;
  await finish(finalGame);
  const cookieName = getCookies({
    baseURL: origin,
    advanced: { cookiePrefix: process.env.BETTER_AUTH_COOKIE_PREFIX },
  }).sessionToken.name;
  for (const p of people) {
    const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
    const signed = (
      await serializeSignedCookie(cookieName, p.token, process.env.BETTER_AUTH_SECRET!)
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
    const page = await context.newPage();
    page.setDefaultTimeout(20000);
    page.on('pageerror', e => errors.push(e.message));
    pages.push(page);
    await page.goto(`${origin}/crossfire`);
    if (await page.getByRole('button', { name: 'Dismiss', exact: true }).count())
      await page.getByRole('button', { name: 'Dismiss', exact: true }).click();
  }
  const [a, b] = pages as [Page, Page];
  await a.getByRole('checkbox', { name: 'Best of three with sideboarding' }).check();
  await shot(a, 'matches-create');
  for (const page of pages) {
    await page.goto(`${origin}/crossfire/${roots[0]}`);
    await page.getByRole('button', { name: 'Ready for next game', exact: true }).waitFor();
    assert(
      !(await page.getByRole('button', { name: 'Rematch with these decks', exact: true }).count()),
      'Rematch offered before two wins',
    );
  }
  await a.getByRole('heading', { name: 'Your opponent won this game', exact: true }).waitFor();
  await b.getByRole('heading', { name: 'You won this game', exact: true }).waitFor();
  await a.getByRole('button', { name: 'View board', exact: true }).click();
  await a.waitForTimeout(3500); // One match poll must not reopen a dismissed result.
  assert(!(await a.locator('.cf-match-dialog').count()), 'Polling reopened the result');
  await a.getByRole('button', { name: /Match 0–1/ }).focus();
  await a.keyboard.press('Enter');
  await a.getByRole('button', { name: 'Ready for next game', exact: true }).waitFor();
  await a
    .getByRole('spinbutton', { name: 'Deck quantity: Battlefield marine', exact: true })
    .fill('10');
  await a.getByRole('spinbutton', { name: 'Deck quantity: Open fire', exact: true }).fill('2');
  await shot(a, 'matches-sideboard');
  await a.getByRole('button', { name: 'Ready for next game', exact: true }).click();
  await b.getByText('Your opponent is ready.', { exact: true }).waitFor();
  assert(
    (await b
      .getByRole('spinbutton', { name: 'Deck quantity: Battlefield marine', exact: true })
      .inputValue()) === '12',
    'Opponent sideboard leaked',
  );
  await a.reload();
  await a.getByRole('button', { name: 'Change my deck', exact: true }).waitFor();
  assert(
    (await a
      .getByRole('spinbutton', { name: 'Deck quantity: Open fire', exact: true })
      .inputValue()) === '2',
    'Submitted deck lost on reload',
  );
  await b.setViewportSize({ width: 430, height: 900 });
  await shot(b, 'matches-mobile');
  await b.setViewportSize({ width: 1600, height: 1000 });
  await b.getByRole('button', { name: 'Ready for next game', exact: true }).click();
  for (const page of pages) {
    await page.getByRole('link', { name: 'Open next game', exact: true }).waitFor();
  }
  const next = await a
    .getByRole('link', { name: 'Open next game', exact: true })
    .getAttribute('href');
  assert(
    next ===
      (await b.getByRole('link', { name: 'Open next game', exact: true }).getAttribute('href')),
    'Two next games were created',
  );
  await a.getByRole('link', { name: 'Open next game', exact: true }).click();
  await a.waitForURL(`**${next}`);
  await a.locator('.cf-match').waitFor();
  await a.locator('.cf-match-dialog').waitFor({ state: 'hidden' });
  assert(!(await a.locator('.cf-match-dialog').count()), 'Active game opened a result dialog');
  await shot(a, 'matches-next-game');
  // The toolbar fits a narrow touch viewport and preserves action priority.
  await a.setViewportSize({ width: 375, height: 850 });
  const toolbar = await a.locator('.cf-header-controls').evaluate(el => ({
    first: el.querySelector('button')?.getAttribute('aria-label'),
    overflow: [...el.querySelectorAll('button,a')].some(
      button => button.getBoundingClientRect().right > innerWidth,
    ),
  }));
  assert(
    toolbar.first === 'Undo' && !toolbar.overflow,
    `Toolbar priority or narrow layout regressed: ${JSON.stringify(toolbar)}`,
  );
  await shot(a, 'matches-toolbar-mobile');
  await a.setViewportSize({ width: 1600, height: 1000 });
  for (const page of pages) {
    await page.goto(`${origin}/crossfire/${roots[1]}`);
    await page.getByRole('button', { name: 'Rematch with these decks', exact: true }).waitFor();
  }
  await a.getByRole('button', { name: 'Rematch with these decks', exact: true }).click();
  await b.getByText('Your opponent wants a rematch.', { exact: true }).waitFor();
  await shot(b, 'matches-rematch');
  await b.getByRole('button', { name: 'Rematch with these decks', exact: true }).click();
  for (const page of pages)
    await page.getByRole('link', { name: 'Open rematch', exact: true }).waitFor();
  assert(
    (await a.getByRole('link', { name: 'Open rematch', exact: true }).getAttribute('href')) ===
      (await b.getByRole('link', { name: 'Open rematch', exact: true }).getAttribute('href')),
    'Rematch consent diverged',
  );
  await b.getByRole('link', { name: 'Open rematch', exact: true }).click();
  await b.locator('.cf-match-dialog').waitFor({ state: 'hidden' });
  await b.locator('.cf-match').waitFor();
  assert(
    !(await b.getByRole('button', { name: 'Rematch', exact: true }).count()),
    'Active single game exposes rematch',
  );
  for (const page of pages) {
    await page.goto(`${origin}/crossfire/${finalGame}`);
    await page.getByRole('button', { name: 'Rematch with these decks', exact: true }).waitFor();
    assert(
      !(await page.getByRole('button', { name: 'Ready for next game', exact: true }).count()),
      'Sideboarding offered after two wins',
    );
  }
  await a.getByRole('heading', { name: 'Your opponent won the match', exact: true }).waitFor();
  await b.getByRole('heading', { name: 'You won the match', exact: true }).waitFor();
  await shot(b, 'matches-finished');
  const done = (await matches.get(principal(0), finalGame))!;
  assert(
    !done.rematchReady.p1 && !done.rematchReady.p2,
    'Result dialog automatically consented to rematch',
  );
  await a.getByRole('button', { name: 'Rematch with these decks', exact: true }).click();
  await b.getByRole('button', { name: 'Rematch with these decks', exact: true }).click();
  await b.getByRole('link', { name: 'Open rematch', exact: true }).click();
  await b.getByRole('button', { name: 'Match 0–0', exact: true }).waitFor();
  assert(
    !(await b.locator('.cf-match-dialog').count()),
    'New match inherited a finished-game dialog',
  );
  assert(!errors.length, `Browser errors: ${errors.join('; ')}`);
  const html = `<!doctype html><meta name="viewport" content="width=device-width"><title>Crossfire matches</title><style>body{font:16px system-ui;background:#081321;color:#e7eef8;margin:24px}a{color:#69d6e8}img{width:100%;border:1px solid #234}</style><h1>Crossfire matches</h1><a href="index.html">Full gallery</a>${shots.map(name => `<h2>${name.replaceAll('-', ' ')}</h2><a href="${name}.png"><img src="${name}.png"></a>`).join('')}`;
  for (const dir of [folder, served]) {
    await Bun.write(`${dir}/matches.html`, html);
    const file = Bun.file(`${dir}/index.html`);
    if (await file.exists()) {
      const text = await file.text();
      if (!text.includes('href="matches.html"'))
        await Bun.write(
          file,
          text.replace(
            '</body>',
            '<p><a href="matches.html">Match and sideboard gallery</a></p></body>',
          ),
        );
    }
    const history = Bun.file(`${dir}/history.html`);
    if (await history.exists()) {
      const text = await history.text();
      if (!text.includes('href="matches.html"'))
        await Bun.write(
          history,
          text + '<p><a href="matches.html">Match and sideboard gallery</a></p>',
        );
    }
  }
  console.log(
    'Match browser passed: automatic game/match results, two-win completion, dismissal and keyboard reopen, toolbar/mobile, sideboard privacy, reload, mutual readiness and rematch consent.',
  );
} finally {
  await browser.close();
  const rows =
    await sql`SELECT game_id FROM play.lobbies WHERE creator_user_id=ANY(${people.map(p => p.userId)}) AND game_id IS NOT NULL`;
  await sql`DELETE FROM play.games WHERE id=ANY(${rows.map(r => r.game_id)})`;
  await sql`DELETE FROM play.lobbies WHERE creator_user_id=ANY(${people.map(p => p.userId)})`;
  await sql`DELETE FROM deck_card WHERE deck_id=ANY(${people.map(p => p.deckId)})`;
  await sql`DELETE FROM deck WHERE id=ANY(${people.map(p => p.deckId)})`;
  await sql`DELETE FROM session WHERE user_id=ANY(${people.map(p => p.userId)})`;
  await sql`DELETE FROM "user" WHERE id=ANY(${people.map(p => p.userId)})`;
  await sql.end();
}
