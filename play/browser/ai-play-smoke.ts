// Opt-in acceptance against real installed models in an isolated running worktree.
import { chromium, expect, type Page } from 'playwright/test';
import postgres from 'postgres';
import { randomUUID } from 'node:crypto';
import { getCookies } from 'better-auth/cookies';
import { serializeSignedCookie } from 'better-call';
import { BoardDriver } from './board-driver.ts';
import { CommandBuilder } from '../ai/full-game/choices.ts';
import { PostgresGameStore } from '../storage/postgres.ts';
const url = process.env.CROSSFIRE_TEST_DATABASE_URL,
  origin = process.env.BETTER_AUTH_URL!;
if (
  !url ||
  url !== process.env.DATABASE_URL ||
  new URL(url).hostname !== '127.0.0.1' ||
  !new URL(url).pathname.startsWith('/swubase_')
)
  throw new Error('Isolated running worktree required');
if (
  !['localhost', '127.0.0.1'].includes(new URL(origin).hostname) &&
  !new URL(origin).hostname.endsWith('.ts.net')
)
  throw new Error('Development origin required');
const sql = postgres(url, { max: 3, onnotice: () => {} }),
  browser = await chromium.launch();
const person = {
  id: `ai-play-browser-${randomUUID()}`,
  session: randomUUID(),
  token: randomUUID(),
  deck: randomUUID(),
};
let gameId: string | undefined, lobbyId: string | undefined;
const errors: string[] = [];
let page: Page | undefined;
try {
  const roster = await Bun.file(
    new URL('../ai/full-game/eight-decks.json', import.meta.url),
  ).json();
  const own = roster.decks[0].snapshot;
  await sql`INSERT INTO "user"(id,name,email,email_verified,created_at,updated_at,display_name,currency,role) VALUES(${person.id},'AI play browser fixture',${person.id + '@invalid.local'},false,now(),now(),${person.id},'USD','crossfire')`;
  await sql`INSERT INTO session(id,token,expires_at,user_id,created_at,updated_at) VALUES(${person.session},${person.token},now()+interval '1 hour',${person.id},now(),now())`;
  await sql`INSERT INTO deck(id,user_id,name,format,leader_card_id_1,base_card_id) VALUES(${person.deck},${person.id},'Greef practice',1,${own.leader},${own.base})`;
  for (const c of own.mainboard)
    await sql`INSERT INTO deck_card(deck_id,card_id,board,quantity) VALUES(${person.deck},${c.cardId},1,${c.quantity})`;
  const context = await browser.newContext({ viewport: { width: 1450, height: 1000 } });
  const name = getCookies({
    baseURL: origin,
    advanced: { cookiePrefix: process.env.BETTER_AUTH_COOKIE_PREFIX },
  }).sessionToken.name;
  const cookie = (
    await serializeSignedCookie(name, person.token, process.env.BETTER_AUTH_SECRET!)
  ).split(';')[0]!;
  await context.addCookies([
    {
      name,
      value: cookie.slice(cookie.indexOf('=') + 1),
      url: origin,
      httpOnly: true,
      secure: origin.startsWith('https:'),
      sameSite: 'Lax',
    },
  ]);
  const available = await context.request.get(origin + '/api/crossfire/ai/opponents');
  expect(available.status()).toBe(200);
  const opponents = (await available.json()).data;
  expect(opponents.length).toBeGreaterThan(0);
  const target = opponents.find((o: { deckKey: string }) => o.deckKey === 'vader') ?? opponents[0];
  page = await context.newPage();
  page.setDefaultTimeout(20000);
  page.on('pageerror', e => errors.push(e.message));
  const driver = new BoardDriver(page);
  page.on('websocket', socket =>
    socket.on('framereceived', frame => {
      try {
        const m = JSON.parse(frame.payload.toString());
        if (m.type === 'error') console.log('socket error', m);
      } catch {}
    }),
  );
  await page.goto(origin + '/crossfire?cfDeck=' + person.deck);
  const dismiss = page.getByRole('button', { name: 'Dismiss', exact: true });
  await dismiss.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
  if (await dismiss.count()) await dismiss.click();
  await page.getByRole('radio', { name: 'Play trained AI', exact: true }).click();
  await page
    .getByRole('combobox', { name: 'AI opposing deck' })
    .selectOption(target.releaseId + '/' + target.deckKey);
  await expect(page.getByRole('button', { name: 'Play against AI', exact: true })).toBeEnabled();
  await page.screenshot({ path: '.swubase/crossfire-ai/play-ai-picker.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('combobox', { name: 'AI opposing deck' }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: '.swubase/crossfire-ai/play-ai-picker-mobile.png' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.setViewportSize({ width: 1450, height: 1000 });
  await page.getByRole('button', { name: 'Play against AI', exact: true }).click();
  await page.waitForURL(/\/crossfire\/[a-f0-9-]+$/);
  lobbyId = page.url().split('/').pop()!;
  gameId = (await sql`SELECT game_id FROM play.lobbies WHERE id=${lobbyId}`)[0]!.game_id;
  await driver.ready();
  await expect(page.locator('.cf-wordmark')).toContainText('AI PRACTICE');
  await expect(
    page.getByText('This game does not affect your statistics.', { exact: false }),
  ).toBeVisible();
  for (let n = 0; n < 8; n++) {
    // Wait for the human's actual turn, not the optional early resource plan while AI is deciding.
    await expect
      .poll(() => !!driver.view?.decision && !driver.view.decision.resourcePlan, { timeout: 30000 })
      .toBe(true);
    const view = await driver.ready(),
      builder = new CommandBuilder(view);
    while (builder.stage !== 'done') {
      const choices = builder.choices();
      builder.choose(
        choices.find(c => c.kind === 'option' && c.option.kind === 'pass') ?? choices[0]!,
      );
    }
    const command = builder.command(),
      option = view.decision!.options.find(o => o.id === command.optionId)!;
    await driver.choose(option, command.selections ?? []);
  }
  const store = new PostgresGameStore(sql);
  await expect
    .poll(
      async () => (await store.readHistory(gameId!)).journal.filter(j => j.actorId === 'p2').length,
      { timeout: 30000 },
    )
    .toBeGreaterThan(1);
  const before = (await store.readHistory(gameId!)).journal.length;
  await driver.refresh();
  expect((await store.readHistory(gameId!)).journal.length).toBeGreaterThanOrEqual(before);
  await page.screenshot({ path: '.swubase/crossfire-ai/play-ai-board.png', fullPage: true });
  await page.getByRole('button', { name: 'Leave game', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Leave game', exact: true }).click();
  await page.waitForURL(/\/crossfire\??[^/]*$/);
  await expect
    .poll(async () => (await sql`SELECT status FROM play.games WHERE id=${gameId!}`)[0]!.status, {
      timeout: 60000,
    })
    .toBe('finalized');
  expect(await sql`SELECT id FROM public.game_result WHERE user_id=${person.id}`).toHaveLength(0);
  await page.getByRole('combobox', { name: 'Filter game opponents' }).selectOption('ai');
  await expect(page).toHaveURL(/cfOpponent=ai/);
  await expect(page.getByText('Excluded from player statistics', { exact: false })).toBeVisible();
  await page.screenshot({ path: '.swubase/crossfire-ai/play-ai-history.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.getByRole('combobox', { name: 'Filter game opponents' }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: '.swubase/crossfire-ai/play-ai-mobile.png' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.getByRole('link', { name: 'Replay', exact: true }).click();
  await expect(page.getByRole('slider', { name: 'Replay position' })).toBeVisible();
  expect(errors).toEqual([]);
  console.log(
    JSON.stringify({
      opponents: opponents.length,
      deck: target.label,
      release: target.releaseId,
      aiCommands: (await store.readHistory(gameId!)).journal.filter(j => j.actorId === 'p2').length,
      reconnected: true,
      replay: true,
      statistics: 0,
    }),
  );
} catch (error) {
  if (page) {
    await page.screenshot({ path: '.swubase/crossfire-ai/play-ai-failure.png', fullPage: true });
    console.log((await page.locator('body').innerText()).slice(-4500));
  }
  throw error;
} finally {
  await browser.close();
  if (lobbyId) await sql`DELETE FROM play.lobbies WHERE id=${lobbyId}`;
  if (gameId) await sql`DELETE FROM play.games WHERE id=${gameId}`;
  await sql`DELETE FROM deck_card WHERE deck_id=${person.deck}`;
  await sql`DELETE FROM deck WHERE id=${person.deck}`;
  await sql`DELETE FROM session WHERE id=${person.session}`;
  await sql`DELETE FROM "user" WHERE id=${person.id}`;
  await sql.end();
}
