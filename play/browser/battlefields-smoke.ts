// Real local admission, selection and board rendering with disposable accounts.
import { chromium, type Page } from 'playwright';
import postgres from 'postgres';
import { randomUUID } from 'node:crypto';
import { mkdir, copyFile } from 'node:fs/promises';
import { getCookies } from 'better-auth/cookies';
import { serializeSignedCookie } from 'better-call';
import { defaultBattlefieldScene, type BattlefieldScene } from '../../shared/types/battlefield.ts';
import { battlefieldSceneSchema } from '../../shared/types/battlefield.ts';
import { ids } from '../testing/helpers.ts';
import { BoardDriver } from './board-driver.ts';

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
  throw new Error('Local browser origin required');
const sql = postgres(url, { max: 3 }),
  browser = await chromium.launch();
const people = [0, 1, 2].map(n => ({
  userId: `battlefield-browser-${randomUUID()}-${n}`,
  sessionId: randomUUID(),
  token: randomUUID(),
  deckId: randomUUID(),
}));
const pages: Page[] = [],
  drivers: BoardDriver[] = [],
  errors: string[] = [];
const folder = '.swubase/crossfire-battlefields',
  served = 'frontend/.swubase/crossfire-battlefields';
const assert = (ok: unknown, message: string) => {
  if (!ok) throw new Error(message);
};
// Repeatable sample fleets use the same editable scene format as saved user battlefields.
function scene(seed: number, imperial: boolean): BattlefieldScene {
  let state = seed;
  const random = () => (state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296;
  const result = defaultBattlefieldScene();
  result.backgroundId = imperial ? 'background-ember' : 'background-nebula';
  const add = (
    itemId: string,
    x: number,
    y: number,
    scale: number,
    rotation: number,
    colorId = 'color-default',
  ) => {
    const p = {
      id: randomUUID(),
      itemId,
      x,
      y,
      scale,
      rotation,
      colorId,
      layerId: result.layers[0]!.id,
      visible: true,
      order: result.placements.length,
    };
    result.placements.push(p);
    return p;
  };
  add('planet', 330, 350, 2.2, 325, imperial ? 'color-gold' : 'color-blue');
  result.placements[0]!.textureId = imperial ? 'desert' : 'ocean';
  add(imperial ? 'ship-executor' : 'ship-home-one', 960, 180, imperial ? 1.25 : 3, 345);
  add(imperial ? 'ship-chimaera' : 'ship-liberty', 440, 120, 2.6, 350);
  add(imperial ? 'ship-devastator' : 'ship-profundity', 1320, 160, 1.9, 350);
  for (let n = 0; n < 18; n++)
    add(
      imperial ? 'ship-tie' : 'ship-x-wing',
      110 + random() * 1380,
      40 + random() * 290,
      1.3 + random() * 1.6,
      330 + random() * 25,
    );
  return battlefieldSceneSchema.parse(result);
}
async function shot(page: Page, name: string) {
  const dismiss = page.getByRole('button', { name: 'Dismiss', exact: true });
  if (await dismiss.isVisible()) await dismiss.click();
  await page.mouse.move(0, 0);
  await page.waitForTimeout(500);
  await page.locator('img').evaluateAll(async images => {
    await Promise.all(
      images
        .filter(
          (image): image is HTMLImageElement => image instanceof HTMLImageElement && image.complete,
        )
        .map(image => image.decode().catch(() => {})),
    );
  });
  await page.screenshot({ path: `${folder}/${name}.png`, fullPage: true });
  await copyFile(`${folder}/${name}.png`, `${served}/${name}.png`);
}
async function checkBoard(page: Page, ownSeat: string, viewerSeat: string | null = ownSeat) {
  await page.locator('.cf-player-battlefield').nth(1).waitFor();
  assert(
    (await page.locator('.cf-battlefield-lower').getAttribute('data-battlefield-seat')) === ownSeat,
    'Battlefield belongs to the wrong side',
  );
  const names: Record<string, string> = { p1: 'Rebel fleet', p2: 'Imperial fleet' };
  for (const [side, seat] of [
    ['own', ownSeat],
    ['opponent', ownSeat === 'p1' ? 'p2' : 'p1'],
  ]) {
    const rail = page.locator(`.cf-player-rail.cf-${side}`);
    assert(
      (await rail.locator('.cf-rail-name').innerText()) ===
        (seat === viewerSeat ? 'You' : names[seat!]),
      'Hand label must use You for your seat and public display names for other players',
    );
    assert(await rail.locator('.cf-rail-label').isVisible(), 'Hand labels must stay visible');
  }
  assert((await page.locator('.cf-player-label').count()) === 0, 'No duplicate leader/base labels');
  const reveal = page.getByRole('checkbox', { name: 'Reveal my hand', exact: true });
  if (await reveal.count()) {
    const placed = await reveal.evaluate(checkbox => {
      const label = checkbox.closest('.cf-rail-label');
      if (!label) return false;
      const count = label.querySelector('small')!.getBoundingClientRect();
      const box = checkbox.getBoundingClientRect();
      return box.top >= count.bottom && box.right <= innerWidth && box.bottom <= innerHeight;
    });
    assert(placed, 'Reveal my hand must be below the hand count and fit on screen');
  }
  const fits = await page.evaluate(() => {
    return [
      ['lower', 'own'],
      ['upper', 'opponent'],
    ].every(([side, player]) => {
      const background = document.querySelector(`.cf-battlefield-${side}`)!.getBoundingClientRect();
      const space = document.querySelector(`.cf-space.cf-${player}`)!.getBoundingClientRect();
      const ground = document.querySelector(`.cf-ground.cf-${player}`)!.getBoundingClientRect();
      return (
        Math.abs(background.left - space.left) < 2 &&
        Math.abs(background.right - ground.right) < 2 &&
        Math.abs(background.top - space.top) < 2 &&
        Math.abs(background.bottom - ground.bottom) < 2
      );
    });
  });
  assert(fits, 'One continuous battlefield must cover both arenas');
  const joined = await page.evaluate(() => {
    const skies = document.querySelector('.cf-battlefield-skies')!;
    const background = skies.getBoundingClientRect();
    const upper = document.querySelector('.cf-space.cf-opponent')!.getBoundingClientRect();
    const lower = document.querySelector('.cf-ground.cf-own')!.getBoundingClientRect();
    const menu = document.querySelector('.cf-action-band')!.getBoundingClientRect();
    const topSky = skies.querySelector('svg')!.getBoundingClientRect();
    const bottomSky = skies.querySelector('svg + svg')!.getBoundingClientRect();
    return (
      Math.abs(background.left - upper.left) < 2 &&
      Math.abs(background.right - lower.right) < 2 &&
      Math.abs(background.top - upper.top) < 2 &&
      Math.abs(background.bottom - lower.bottom) < 2 &&
      background.top < menu.top &&
      background.bottom > menu.bottom &&
      Math.abs(topSky.top - upper.top) < 2 &&
      Math.abs(bottomSky.bottom - lower.bottom) < 2 &&
      Math.abs(topSky.width - background.width) < 2 &&
      Math.abs(bottomSky.width - background.width) < 2 &&
      bottomSky.top <= menu.top &&
      topSky.bottom >= menu.bottom &&
      menu.top >= upper.bottom &&
      menu.bottom <= lower.top &&
      topSky.bottom < lower.bottom &&
      bottomSky.top > upper.top &&
      getComputedStyle(skies).pointerEvents === 'none' &&
      getComputedStyle(skies.querySelector('svg + svg')!).maskImage !== 'none'
    );
  });
  assert(joined, 'The blended sky must span both players and continue beneath the middle menu');
  const colors = await page
    .locator('.cf-battlefield-skies > svg')
    .evaluateAll(skies =>
      skies.map(sky => sky.querySelector('stop:last-child')!.getAttribute('stop-color')),
    );
  assert(
    colors[0] === (ownSeat === 'p1' ? '#190e16' : '#100d23') &&
      colors[1] === (ownSeat === 'p1' ? '#100d23' : '#190e16'),
    'Sky colors belong to the wrong player',
  );
  const reflected = await page.evaluate(() => {
    return [
      { side: 'lower', x: 330, y: 350, mirrored: false },
      { side: 'upper', x: 1400, y: 82.5, mirrored: true },
    ].every(({ side, x, y, mirrored }) => {
      const planet = document.querySelector<SVGGElement>(`.cf-battlefield-${side} > svg > g`)!;
      const matrix = planet.transform.baseVal.consolidate()!.matrix;
      // The asymmetric planet position distinguishes a diagonal reflection from
      // a 180-degree turn; equal, perpendicular basis vectors keep it circular.
      return (
        Math.abs(matrix.e - x) < 0.001 &&
        Math.abs(matrix.f - y) < 0.001 &&
        matrix.a * matrix.d - matrix.b * matrix.c < 0 === mirrored &&
        Math.abs(Math.hypot(matrix.a, matrix.b) - Math.hypot(matrix.c, matrix.d)) < 0.001 &&
        Math.abs(matrix.a * matrix.c + matrix.b * matrix.d) < 0.001
      );
    });
  });
  assert(reflected, 'Opponent layout must mirror diagonally without stretching the planet');
  assert(
    (await page.locator('.cf-initiative').count()) === 1,
    'Only the initiative holder should have a marker',
  );
  const corner = await page.locator('.cf-initiative').evaluate(marker => {
    const arena = marker.closest('.cf-ground');
    if (!arena) return false;
    const box = marker.getBoundingClientRect();
    const bounds = arena.getBoundingClientRect();
    const opponent = arena.classList.contains('cf-opponent');
    const cards = arena.querySelector('.cf-arena-cards')!.getBoundingClientRect();
    const styles = getComputedStyle(arena);
    // The badge may hang just outside the border; the card viewport still fills
    // the arena, without a reserved strip above, below, or beside the cards.
    const edge = opponent ? bounds.bottom - box.bottom : box.top - bounds.top;
    return (
      bounds.right - box.right >= -5 &&
      bounds.right - box.right <= 0 &&
      edge >= -12 &&
      edge <= 0 &&
      box.width <= 110 &&
      box.height <= 32 &&
      Math.abs(cards.top - bounds.top - parseFloat(styles.borderTopWidth)) < 1 &&
      Math.abs(cards.bottom - bounds.bottom + parseFloat(styles.borderBottomWidth)) < 1 &&
      Math.abs(cards.right - bounds.right + parseFloat(styles.borderRightWidth)) < 1 &&
      getComputedStyle(marker).pointerEvents === 'none'
    );
  });
  assert(corner, 'Compact initiative must straddle the ground corner without reserving card space');
}
try {
  await mkdir(folder, { recursive: true });
  await mkdir(served, { recursive: true });
  for (const [n, p] of people.entries()) {
    await sql`INSERT INTO "user"(id,name,email,email_verified,created_at,updated_at,display_name,currency,role) VALUES (${p.userId},'Battlefield fixture',${p.userId + '@invalid.local'},false,now(),now(),${n === 0 ? 'Rebel fleet' : n === 1 ? 'Imperial fleet' : 'Observer'},'USD','crossfire')`;
    await sql`INSERT INTO session(id,token,expires_at,user_id,created_at,updated_at) VALUES (${p.sessionId},${p.token},now()+interval '1 hour',${p.userId},now(),now())`;
    await sql`INSERT INTO deck(id,user_id,name,format,leader_card_id_1,base_card_id) VALUES (${p.deckId},${p.userId},'Battlefield showcase deck',1,${ids.leader},${ids.base})`;
    for (const cardId of [
      ids.marine,
      'phoenix-squadron-a-wing',
      'green-leader--crynyd-s-sacrifice',
    ])
      await sql`INSERT INTO deck_card(deck_id,card_id,board,quantity) VALUES (${p.deckId},${cardId},1,8)`;
  }
  const chosen = randomUUID(),
    other = randomUUID(),
    only = randomUUID();
  await sql`INSERT INTO battlefield(id,user_id,name,scene,active) VALUES
    (${other},${people[0]!.userId},'Distant orbit',${sql.json(defaultBattlefieldScene(randomUUID()))},true),
    (${chosen},${people[0]!.userId},'Rebel rendezvous',${sql.json(scene(701, false))},false),
    (${only},${people[1]!.userId},'Imperial blockade',${sql.json(scene(913, true))},true)`;
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
    drivers.push(new BoardDriver(page));
    await page.goto(`${origin}/crossfire`);
    const dismiss = page.getByRole('button', { name: 'Dismiss', exact: true });
    await dismiss
      .waitFor({ timeout: 5000 })
      .then(() => dismiss.click())
      .catch(() => {});
    await page.getByText('Ready for Crossfire practice.', { exact: true }).waitFor();
  }
  const [a, b, c] = pages as [Page, Page, Page];
  assert(
    (await a.getByRole('combobox', { name: 'Your battlefield' }).inputValue()) === other,
    'Active battlefield was not the default',
  );
  await a.getByRole('combobox', { name: 'Your battlefield' }).selectOption(chosen);
  assert(
    (await b.getByRole('combobox', { name: 'Your battlefield' }).count()) === 0,
    'Single battlefield should not show a chooser',
  );
  assert(
    (await c.getByRole('combobox', { name: 'Your battlefield' }).count()) === 0,
    'No battlefields should not show a chooser',
  );
  await shot(a, 'battlefield-selection');
  const created = a.waitForResponse(
    response =>
      response.url().endsWith('/api/crossfire/lobbies') && response.request().method() === 'POST',
  );
  await a.getByRole('button', { name: 'Create invitation', exact: true }).click();
  const response = await created;
  assert(response.ok(), 'Invitation failed');
  const lobbyId = (await response.json()).data.id;
  await b.goto(`${origin}/crossfire/${lobbyId}`);
  await b
    .getByRole('button', { name: 'Select deck: Battlefield showcase deck', exact: true })
    .click();
  await b.getByRole('button', { name: 'Accept invitation and play', exact: true }).click();
  await a.goto(`${origin}/crossfire/${lobbyId}`);
  await Promise.all(drivers.slice(0, 2).map(d => d.ready()));
  await checkBoard(a, 'p1');
  await checkBoard(b, 'p2');
  for (const page of [a, b]) {
    const dismiss = page.getByRole('button', { name: 'Dismiss', exact: true });
    if (await dismiss.isVisible()) await dismiss.click();
  }
  const frozen = await a.evaluate(
    async id => (await (await fetch(`/api/crossfire/lobbies/${id}/battlefields`)).json()).data,
    lobbyId,
  );
  assert(
    frozen.p1.backgroundId === 'background-nebula' && frozen.p2.backgroundId === 'background-ember',
    'Selection did not reach both saved scenes',
  );
  // Play setup and a few real cards, proving backgrounds cannot intercept interactions.
  for (let step = 0; step < 26; step++) {
    if (drivers[0]!.view?.cards.filter(c => c.zone === 'space' || c.zone === 'ground').length! >= 4)
      break;
    await a.waitForTimeout(100);
    const d = drivers
      .slice(0, 2)
      .find(d => d.view?.decision && !d.view.decision.resourcePlan?.confirmed);
    assert(d, 'Neither player has a decision');
    const decision = (await d!.ready()).decision!;
    const option =
      decision.options.find(o => o.kind === 'mulligan' && !o.takeMulligan) ??
      decision.options.find(o => o.kind === 'play') ??
      decision.options.find(o => o.kind === 'pass') ??
      decision.options[0]!;
    await d!.choose(option, decision.selection?.cards.slice(0, decision.selection.min) ?? []);
  }
  assert(
    drivers[0]!.view!.cards.some(c => c.zone === 'ground' || c.zone === 'space'),
    'Could not play cards over the backgrounds',
  );
  assert(
    !drivers[0]!.view!.initiative.claimed,
    'Unclaimed initiative screenshot needs an unclaimed state',
  );
  const revealControl = a.getByRole('checkbox', { name: 'Reveal my hand', exact: true });
  await revealControl.check();
  await b.waitForFunction(
    () =>
      document.querySelectorAll('.cf-player-rail.cf-opponent .cf-hand [data-hand-card]').length > 0,
  );
  await revealControl.uncheck();
  await b.waitForFunction(
    () =>
      document.querySelectorAll('.cf-player-rail.cf-opponent .cf-hand [data-hand-card]').length ===
      0,
  );
  await shot(a, 'initiative-before');
  await a
    .locator('.cf-initiative')
    .screenshot({ path: `${folder}/initiative-unclaimed-marker.png` });
  let claimant: BoardDriver | undefined;
  for (let attempt = 0; attempt < 30; attempt++) {
    await Promise.all(drivers.slice(0, 2).map(d => d.ready()));
    claimant = drivers
      .slice(0, 2)
      .find(d => d.view?.decision?.options.some(o => o.kind === 'take-initiative'));
    if (claimant) break;
    const resolving = drivers
      .slice(0, 2)
      .find(
        d =>
          d.view?.decision &&
          d.view.decision.kind !== 'action' &&
          !d.view.decision.resourcePlan?.confirmed,
      );
    if (resolving) {
      const decision = (await resolving.ready()).decision!;
      const option = decision.options.find(o => o.kind === 'pass') ?? decision.options[0]!;
      await resolving.choose(
        option,
        decision.selection?.cards.slice(0, decision.selection.min) ?? [],
      );
    } else {
      await a.waitForTimeout(100);
    }
  }
  assert(claimant, 'No player can take initiative');
  const initiativeOption = (await claimant!.ready()).decision!.options.find(
    o => o.kind === 'take-initiative',
  )!;
  await claimant!.choose(initiativeOption);
  const claimedView = await claimant!.ready();
  assert(claimedView.initiative.claimed, 'Taking initiative did not update the game');
  for (const [index, page] of [a, b].entries()) {
    await page.locator('.cf-initiative[data-claimed="true"]').waitFor();
    await checkBoard(page, index === 0 ? 'p1' : 'p2');
    const side = claimedView.initiative.holder === (index === 0 ? 'p1' : 'p2') ? 'own' : 'opponent';
    assert(
      (await page.locator(`.cf-ground.cf-${side} .cf-initiative`).count()) === 1,
      'Claimed marker belongs to the wrong player',
    );
  }
  await a.emulateMedia({ reducedMotion: 'reduce' });
  assert(
    await a
      .locator('.cf-initiative')
      .evaluate(marker => getComputedStyle(marker).animationName === 'none'),
    'Reduced motion must disable the initiative pulse',
  );
  await a.emulateMedia({ reducedMotion: 'no-preference' });
  assert(
    await a
      .locator('.cf-initiative')
      .evaluate(marker => getComputedStyle(marker).animationName === 'cf-initiative-claimed'),
    'Taking initiative should highlight the marker',
  );
  await shot(a, 'battlefields-desktop');
  await shot(b, 'battlefields-opponent');
  await a.reload();
  await drivers[0]!.ready();
  await checkBoard(a, 'p1');
  await a.setViewportSize({ width: 390, height: 844 });
  await checkBoard(a, 'p1');
  await shot(a, 'battlefields-mobile');
  assert(
    await a.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    'Mobile board overflow',
  );
  await a.setViewportSize({ width: 844, height: 390 });
  await checkBoard(a, 'p1');
  // Stress the same menu with more content than its landscape band can fit.
  // Only temporary DOM content is added; no game commands or state are changed.
  const scrollsWithinBand = await a.evaluate(() => {
    const menu = document.querySelector<HTMLElement>('.cf-action-band')!;
    const overflow = document.createElement('div');
    overflow.style.cssText = 'height:160px;flex:0 0 100%';
    menu.append(overflow);
    try {
      const box = menu.getBoundingClientRect();
      const upper = document.querySelector('.cf-space.cf-opponent')!.getBoundingClientRect();
      const lower = document.querySelector('.cf-space.cf-own')!.getBoundingClientRect();
      return (
        box.top >= upper.bottom && box.bottom <= lower.top && menu.scrollHeight > menu.clientHeight
      );
    } finally {
      overflow.remove();
    }
  });
  assert(scrollsWithinBand, 'Crowded landscape menu must scroll without covering either arena');
  await shot(a, 'battlefields-landscape');
  await c.goto(`${origin}/crossfire/${lobbyId}`);
  await drivers[2]!.ready();
  await checkBoard(c, 'p1', null);
  assert(
    (await c.getByRole('checkbox', { name: 'Reveal my hand', exact: true }).count()) === 0,
    'Spectators cannot reveal player hands',
  );
  await shot(c, 'battlefields-spectator');
  await a.setViewportSize({ width: 1600, height: 1000 });
  await a.goto(`${origin}/crossfire/replay/${lobbyId}`);
  await a.locator('.cf-player-battlefield').nth(1).waitFor();
  await shot(a, 'battlefields-replay');
  await a.getByRole('combobox', { name: 'Player at bottom' }).selectOption('p2');
  await checkBoard(a, 'p2', 'p1');

  // Older games and players without a saved layout still render. Override only
  // this browser's cosmetic response; the admitted game and snapshots stay intact.
  const battlefieldUrl = `**/api/crossfire/lobbies/${lobbyId}/battlefields`;
  for (const missing of ['p1', 'p2', 'both'] as const) {
    await a.route(battlefieldUrl, route =>
      route.fulfill({
        json: {
          data: {
            p1: missing === 'p1' || missing === 'both' ? null : frozen.p1,
            p2: missing === 'p2' || missing === 'both' ? null : frozen.p2,
          },
        },
      }),
    );
    const loaded = a.waitForResponse(response =>
      response.url().endsWith(`/lobbies/${lobbyId}/battlefields`),
    );
    await a.reload();
    await loaded;
    await a.locator('.cf-action-band').waitFor();
    await a.getByRole('combobox', { name: 'Player at bottom' }).selectOption('p1');
    await a.evaluate(
      () =>
        new Promise<void>(resolve =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    );
    await a.waitForFunction(
      expected => document.querySelectorAll('.cf-player-battlefield').length === expected,
      missing === 'both' ? 0 : 1,
    );
    assert(
      (await a.locator('.cf-battlefield-skies').count()) === (missing === 'both' ? 0 : 1),
      'Missing battlefield fallback failed',
    );
    if (missing !== 'both') {
      assert(
        (await a.locator('.cf-player-battlefield').getAttribute('data-battlefield-seat')) ===
          (missing === 'p1' ? 'p2' : 'p1'),
        'Fallback put the remaining artwork on the wrong player',
      );
      assert(
        (await a.locator('.cf-battlefield-skies > svg').count()) === 2,
        'Single-layout fallback must include a neutral sky',
      );
      const colors = await a
        .locator('.cf-battlefield-skies > svg')
        .evaluateAll(skies =>
          skies.map(sky => sky.querySelector('stop:last-child')!.getAttribute('stop-color')),
        );
      assert(
        colors[0] === (missing === 'p2' ? '#0a141e' : '#190e16') &&
          colors[1] === (missing === 'p1' ? '#0a141e' : '#100d23'),
        'Neutral sky must belong to the player without a layout',
      );
    }
    await shot(a, `battlefields-missing-${missing}`);
    await a.unroute(battlefieldUrl);
  }
  assert(!errors.length, errors.join('\n'));
  console.log(
    'Battlefield browser passed: multiple/single/zero choices, actual admission, both player perspectives, diagonal reflection, blended sky beneath the menu, card play, reload, mobile, spectator, replay and missing-layout fallbacks.',
  );
} catch (error) {
  for (const [i, page] of pages.entries()) {
    await page.screenshot({ path: `${folder}/failure-${i}.png`, fullPage: true }).catch(() => {});
    console.log(`Failure ${i}: ${(await page.locator('body').innerText()).slice(-2000)}`);
  }
  throw error;
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
