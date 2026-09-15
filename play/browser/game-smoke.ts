// Opt-in browser acceptance against the running, isolated development worktree.
// Synthetic identities are inserted only into that local DB; production auth has no bypass.
import { chromium } from 'playwright';
import { BoardDriver } from './board-driver.ts';
import { disclosureComplete } from '../view/types.ts';
import postgres from 'postgres';
import { randomUUID } from 'node:crypto';
import { getCookies } from 'better-auth/cookies';
import { serializeSignedCookie } from 'better-call';
if (
  !process.env.CROSSFIRE_TEST_DATABASE_URL ||
  process.env.CROSSFIRE_TEST_DATABASE_URL !== process.env.DATABASE_URL
)
  throw new Error('Set CROSSFIRE_TEST_DATABASE_URL to the running worktree DATABASE_URL');
const database = new URL(process.env.CROSSFIRE_TEST_DATABASE_URL);
if (database.hostname !== '127.0.0.1' || !database.pathname.startsWith('/swubase_'))
  throw new Error('Refusing non-worktree DB');
const sql = postgres(database.href, { max: 3 });
const origin = process.env.BETTER_AUTH_URL!;
if (
  !['localhost', '127.0.0.1', '[::1]'].includes(new URL(origin).hostname) &&
  !new URL(origin).hostname.endsWith('.ts.net')
)
  throw new Error('Refusing a non-development browser origin');
const cookieName = getCookies({
  baseURL: origin,
  advanced: { cookiePrefix: process.env.BETTER_AUTH_COOKIE_PREFIX },
}).sessionToken.name;
const exploitScenario = process.env.CROSSFIRE_BROWSER_SCENARIO === 'exploit';
const smuggleScenario = process.env.CROSSFIRE_BROWSER_SCENARIO === 'smuggle';
const leaderFacesScenario = process.env.CROSSFIRE_BROWSER_SCENARIO === 'leader-faces';
const resourceLoanScenario = process.env.CROSSFIRE_BROWSER_SCENARIO === 'resource-loan';
const baseAllocationScenario = process.env.CROSSFIRE_BROWSER_SCENARIO === 'base-allocation';
const baseChoicesScenario = process.env.CROSSFIRE_BROWSER_SCENARIO === 'base-choices';
const abilityCostScenario = process.env.CROSSFIRE_BROWSER_SCENARIO === 'ability-cost';
const resourceScenario = process.env.CROSSFIRE_BROWSER_SCENARIO === 'resource-play';
const taxScenario = process.env.CROSSFIRE_BROWSER_SCENARIO === 'action-tax';
const lukeScenario = process.env.CROSSFIRE_BROWSER_SCENARIO === 'luke';
const identityScenario = process.env.CROSSFIRE_BROWSER_SCENARIO === 'identity';
const victoryScenario = process.env.CROSSFIRE_BROWSER_SCENARIO === 'victory';
const nabatScenario = process.env.CROSSFIRE_BROWSER_SCENARIO === 'nabat';
const orderScenario = process.env.CROSSFIRE_BROWSER_SCENARIO === 'deck-order';
const captureScenario = process.env.CROSSFIRE_BROWSER_SCENARIO === 'capture';
const sacrificeScenario = process.env.CROSSFIRE_BROWSER_SCENARIO === 'sacrifice';
const namingScenario = process.env.CROSSFIRE_BROWSER_SCENARIO === 'naming';
const pilotScenario = process.env.CROSSFIRE_BROWSER_SCENARIO === 'pilot';
const creditScenario = process.env.CROSSFIRE_BROWSER_SCENARIO === 'credits';
const discloseScenario = process.env.CROSSFIRE_BROWSER_SCENARIO === 'disclose';
const plotScenario = process.env.CROSSFIRE_BROWSER_SCENARIO === 'plot';
const indirectScenario = pilotScenario || process.env.CROSSFIRE_BROWSER_SCENARIO === 'indirect';
const inspectionScenario =
  namingScenario || process.env.CROSSFIRE_BROWSER_SCENARIO === 'inspection';
const hostCard = exploitScenario
  ? 'hailfire-tank'
  : smuggleScenario
    ? 'collections-starhopper'
    : lukeScenario
      ? 'luke-skywalker--you-still-with-me-'
      : identityScenario
        ? 'improvised-identity'
        : victoryScenario
          ? 'confidence-in-victory'
          : resourceScenario
            ? 'tear-this-ship-apart'
            : taxScenario
              ? 'the-eye-of-aldhani'
              : orderScenario
                ? 'qui-gon-jinn--influencing-chance'
                : captureScenario
                  ? 'arrest'
                  : namingScenario
                    ? 'garindan--information-broker'
                    : creditScenario
                      ? 'champion-s-kt9-podracer'
                      : discloseScenario
                        ? 'syril-karn--where-is-he-'
                        : plotScenario
                          ? 'sudden-ferocity'
                          : inspectionScenario
                            ? 'remnant-lookouts'
                            : indirectScenario
                              ? 'tie-bomber'
                              : 'battlefield-marine';
const hostBase = resourceLoanScenario
  ? 'sundari-palace'
  : baseAllocationScenario
    ? 'executioner-s-arena'
    : baseChoicesScenario
      ? 'mystic-monastery'
      : identityScenario
        ? 'administrator-s-tower'
        : nabatScenario
          ? 'nabat-village'
          : resourceScenario ||
              orderScenario ||
              captureScenario ||
              inspectionScenario ||
              creditScenario
            ? 'administrator-s-tower'
            : 'command-center';
const hostLeader = exploitScenario
  ? 'count-dooku--face-of-the-confederacy'
  : smuggleScenario
    ? 'lando-calrissian--with-impeccable-taste'
    : leaderFacesScenario
      ? 'chancellor-palpatine--playing-both-sides'
      : resourceLoanScenario
        ? 'han-solo--audacious-smuggler'
        : abilityCostScenario
          ? 'chewbacca--hero-of-kessel'
          : resourceScenario || sacrificeScenario
            ? 'director-krennic--amidst-my-achievement'
            : pilotScenario
              ? 'boba-fett--any-methods-necessary'
              : orderScenario ||
                  captureScenario ||
                  indirectScenario ||
                  inspectionScenario ||
                  discloseScenario
                ? 'darth-maul--sith-revealed'
                : 'sabine-wren--galvanized-revolutionary';
const prefix = `browser-smoke-${randomUUID()}`;
const users = [0, 1, 2].map(n => ({
  id: `${prefix}-${n}`,
  sid: `${prefix}-s${n}`,
  token: randomUUID(),
  deck: randomUUID(),
}));
const lobbyIds: string[] = [],
  gameIds: string[] = [];
const browser = await chromium.launch({ headless: true });
const catalog = await Bun.file(
  new URL('../../server/db/json/card-list.json', import.meta.url),
).json();
const hiddenImages = new Set(
  Object.values(catalog['consular-security-force'].variants)
    .flatMap((variant: any) => [variant.image?.front, variant.image?.back])
    .filter(Boolean),
);
const imageRequests: string[] = [],
  playerFrames: string[] = [];
const pages: Awaited<ReturnType<typeof browser.newPage>>[] = [];
const drivers: BoardDriver[] = [];
const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};
try {
  for (const user of users) {
    await sql`INSERT INTO "user" (id,name,email,email_verified,created_at,updated_at,display_name,currency, role) VALUES (${user.id},'Synthetic browser fixture',${user.id + '@invalid.local'},false,now(),now(),${user.id},'USD', 'crossfire')`;
    await sql`INSERT INTO session (id,token,expires_at,user_id,created_at,updated_at) VALUES (${user.sid},${user.token},now()+interval '1 hour',${user.id},now(),now())`;
    await sql`INSERT INTO deck (id,user_id,format,leader_card_id_1,base_card_id) VALUES (${user.deck},${user.id},1,${user === users[0] ? hostLeader : 'sabine-wren--galvanized-revolutionary'},${user === users[0] ? hostBase : 'command-center'})`;
    await sql`INSERT INTO deck_card (deck_id,card_id,board,quantity) VALUES (${user.deck},${user === users[1] ? 'consular-security-force' : hostCard},1,${victoryScenario || leaderFacesScenario || smuggleScenario ? 36 : 12})`;
    if ((leaderFacesScenario || exploitScenario) && user === users[0])
      await sql`INSERT INTO deck_card (deck_id,card_id,board,quantity) VALUES (${user.deck},'tie-ln-fighter',1,12)`;
    if (identityScenario && user === users[0])
      await sql`INSERT INTO deck_card (deck_id,card_id,board,quantity) VALUES (${user.deck},'battlefield-marine',1,12)`;
    if (lukeScenario)
      await sql`INSERT INTO deck_card (deck_id,card_id,board,quantity) VALUES (${user.deck},${user === users[0] ? 'red-squadron-x-wing' : 'outer-rim-constable'},1,12)`;
    await sql`UPDATE deck SET name = 'Crossfire browser fixture' WHERE id = ${user.deck}`;
    await sql`INSERT INTO deck_information (deck_id) VALUES (${user.deck})`;
    const signed = (
      await serializeSignedCookie(cookieName, user.token, process.env.BETTER_AUTH_SECRET!)
    ).split(';')[0]!;
    const context = await browser.newContext();
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
    pages.push(page);
    drivers.push(new BoardDriver(page));
    page.setDefaultTimeout(15000);
    if (user === users[0]) {
      page.on('request', request => {
        if (request.resourceType() === 'image') imageRequests.push(request.url());
      });
      page.on('websocket', socket =>
        socket.on('framereceived', frame => playerFrames.push(frame.payload.toString())),
      );
    }
    await page.goto(origin + '/api');
  }
  const [host, guest, spectator] = pages;
  const pageErrors: string[] = [];
  for (const page of pages) page.on('pageerror', error => pageErrors.push(error.message));
  console.log('Opening home');
  await host!.goto(origin + '/crossfire?cfDeck=' + users[0]!.deck);
  if (await host!.getByRole('button', { name: 'Dismiss', exact: true }).count())
    await host!.getByRole('button', { name: 'Dismiss', exact: true }).click();
  await host!.getByText('Ready for Crossfire practice.', { exact: true }).waitFor();
  const originalDark = await host!.evaluate(() =>
    document.documentElement.classList.contains('dark'),
  );
  for (const dark of [false, true]) {
    await host!.evaluate(dark => document.documentElement.classList.toggle('dark', dark), dark);
    const logos = host!.locator('[data-crossfire-logo] img:visible');
    assert((await logos.count()) >= 1, 'Navigation omitted the Crossfire logo');
    assert(
      await logos.evaluateAll(async (images, dark) => {
        await Promise.all(images.map(image => (image as HTMLImageElement).decode()));
        return images.every(image =>
          (image as HTMLImageElement).src.includes(`logo-${dark ? 'dark' : 'light'}`),
        );
      }, dark),
      'Crossfire logo did not follow the application theme',
    );
    await host!.screenshot({
      path: `.swubase/crossfire-home-${dark ? 'dark' : 'light'}.png`,
      fullPage: true,
    });
  }
  await host!.evaluate(
    dark => document.documentElement.classList.toggle('dark', dark),
    originalDark,
  );
  await host!.getByRole('button', { name: 'Game settings', exact: true }).click();
  await host!.getByRole('checkbox', { name: 'Let spectators reveal both hands' }).check();
  await host!.getByRole('button', { name: 'Done', exact: true }).click();
  await host!.getByRole('button', { name: 'Create invitation', exact: true }).click();
  await host!.getByRole('heading', { name: 'Waiting for your opponent' }).waitFor();
  console.log('Created invitation');
  const lobbyId = new URL(host!.url()).pathname.split('/').at(-1)!;
  lobbyIds.push(lobbyId);
  await host!.screenshot({ path: '.swubase/crossfire-lobby.png', fullPage: true });
  await guest!.goto(origin + '/crossfire/' + lobbyId);
  await guest!.getByRole('combobox', { name: 'Your decks' }).click();
  await guest!.getByRole('option', { name: 'Crossfire browser fixture' }).click();
  await guest!.getByText('Ready for Crossfire practice.', { exact: true }).waitFor();
  assert(
    await guest!.getByRole('button', { name: 'Join game', exact: true }).isDisabled(),
    'Join enabled without consent',
  );
  await guest!
    .getByRole('checkbox', {
      name: 'I agree to these visibility settings. Join and start the game.',
    })
    .check();
  await guest!.getByRole('button', { name: 'Join game', exact: true }).click();
  await guest!.getByRole('button', { name: 'Resync', exact: true }).waitFor();
  const [lobby] = await sql`SELECT game_id FROM play.lobbies WHERE id = ${lobbyId}`;
  gameIds.push(lobby!.game_id);
  await spectator!.goto(origin + '/crossfire/' + lobbyId);
  for (const page of pages) {
    await page.locator('[data-card-handle]').first().waitFor();
    if (await page.getByRole('button', { name: 'Dismiss', exact: true }).count())
      await page.getByRole('button', { name: 'Dismiss', exact: true }).click();
  }
  await host!.setViewportSize({ width: 1600, height: 1000 });
  await guest!.setViewportSize({ width: 390, height: 844 });
  let actions = 0,
    checkedPrivacy = false,
    recovered = false,
    inspectedCopy = false,
    cancelledAttack = false,
    capturedScreens = false,
    logChecked = false;
  let captured = false,
    rescued = false,
    sidious = false,
    palpatineReturned = false;
  const effects = new Map<string, number>(),
    used = new Map<string, number>();
  const bump = (map: Map<string, number>, key: string) => map.set(key, (map.get(key) ?? 0) + 1);
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  const hasEffect = (effect: string) => (effects.get(effect) ?? 0) > 0;
  for (; actions < 350; actions++) {
    if (drivers[0]!.view?.result) break;
    let driver: BoardDriver | undefined;
    for (let wait = 0; wait < 150 && !driver; wait++) {
      driver = drivers
        .slice(0, 2)
        .find(d => d.view?.decision && !d.view.decision.resourcePlan?.confirmed);
      if (!driver) {
        if (drivers[0]!.view?.result) break;
        await sleep(100);
      }
    }
    if (!driver) {
      assert(drivers[0]!.view?.result, 'Neither player can act');
      break;
    }
    const actor = driver.page,
      view = await driver.ready(),
      decision = view.decision!;
    const name = (id?: string) =>
      view.cards.find(c => c.id === id)?.face?.cardId ??
      decision.inspectedCards.find(c => c.id === id)?.face.cardId;
    if (captureScenario && view.cards.some(c => c.zone === 'captured')) {
      const captive = view.cards.find(c => c.zone === 'captured')!;
      assert(captive.face?.cardId === 'consular-security-force', 'Captured identity was lost');
      assert(await driver.card(captive.id).count(), 'Captured card is missing from its guard');
      if (!captured) {
        captured = true;
        await driver.refresh();
        continue;
      }
    }
    if (view.events.some(e => e.type.includes('rescued'))) rescued = true;
    if (leaderFacesScenario) {
      const leader = view.cards.find(
        c => c.face?.printedKind === 'leader' && c.face.cardId === hostLeader && c.zone === 'base',
      );
      if (leader?.face?.side === 'back' && !sidious) {
        const src = await driver.card(leader.id).locator('img').getAttribute('src');
        assert(
          Object.values(catalog[hostLeader].variants).some(
            (v: any) => v.image?.back && src?.endsWith('/' + v.image.back),
          ),
          'Back-face leader artwork is wrong',
        );
        sidious = true;
        await driver.refresh();
        continue;
      }
      if (sidious && leader?.face?.side === 'front') palpatineReturned = true;
    }
    for (const card of decision.inspectedCards) {
      if (await driver.card(card.id).count())
        assert(
          (await driver.card(card.id).getAttribute('aria-label'))?.includes(card.face.name),
          'Choice tray omitted a permitted inspected face',
        );
    }
    if (!inspectedCopy) {
      const leader = view.cards.find(c => c.face?.kind === 'leader')!;
      const count = driver.sentCommands;
      await driver.card(leader.id).focus();
      await actor.keyboard.press('i');
      await actor.locator('.cf-inspect').waitFor();
      await actor.keyboard.press('Escape');
      assert(driver.sentCommands === count, 'Inspection submitted a command');
      inspectedCopy = true;
    }
    if (!checkedPrivacy && view.cards.some(c => c.zone === 'hand')) {
      for (const d of drivers.slice(0, 2)) {
        const current = await d.ready();
        const owners = new Set(current.cards.filter(c => c.zone === 'hand').map(c => c.owner));
        assert(owners.size === 1, 'Player saw opponent hand');
      }
      await spectator!.locator('[data-zone="hand"]').first().waitFor();
      await spectator!.getByRole('checkbox', { name: 'Show revealed hands' }).uncheck();
      await spectator!.waitForFunction(() => !document.querySelector('[data-zone="hand"]'));
      await spectator!.getByRole('checkbox', { name: 'Show revealed hands' }).check();
      await spectator!.locator('[data-zone="hand"]').first().waitFor();
      assert(
        !playerFrames.some(
          frame =>
            frame.includes('consular-security-force') || frame.includes('Consular Security Force'),
        ),
        'Player received hidden opponent identity',
      );
      assert(
        !imageRequests.some(url => hiddenImages.has(url.split('/').at(-1))),
        'Player fetched hidden opponent artwork',
      );
      assert(drivers[2]!.sentCommands === 0, 'Spectator sent a game command');
      checkedPrivacy = true;
    }
    if (!recovered && decision.kind === 'resource' && decision.selection?.cards.length) {
      await driver.select([decision.selection.cards[0]!]);
      assert(
        (await driver.card(decision.selection.cards[0]!).getAttribute('aria-pressed')) === 'true',
        'Card click did not select a resource',
      );
      const before = driver.sentCommands;
      await driver.refresh();
      assert(driver.sentCommands === before, 'Reload submitted an unconfirmed resource choice');
      assert(
        !(await actor.locator('[data-card-handle][aria-pressed="true"]').count()),
        'Reload retained private local selection',
      );
      recovered = true;
      continue;
    }
    // Recover a real card-specific continuation once, with fresh viewer handles.
    if (decision.effect && !effects.has(`reload:${decision.effect}`)) {
      bump(effects, `reload:${decision.effect}`);
      if (
        [
          'exploit-payment',
          'inspect-resources',
          'ability-payment',
          'allocate-indirect',
          'look-discard',
          'name-card',
          'order-top-of-deck',
          'choose-hand-top',
        ].includes(decision.effect)
      ) {
        const count = driver.sentCommands;
        await driver.refresh();
        assert(driver.sentCommands === count, 'Continuation reload submitted a command');
        continue;
      }
    }
    const opts = decision.options;
    const pass = opts.find(o => o.kind === 'pass');
    const own = actor === host;
    const actionKey = (o: (typeof opts)[number]) => `${name(o.cards[0])}:${o.action?.id ?? o.kind}`;
    const unused = (o: (typeof opts)[number]) =>
      !used.has(`${view.activePlayer}:${view.round}:${actionKey(o)}`);
    const abilities = opts.filter(o => o.kind === 'use-ability' && unused(o));
    const deploy = abilities.find(o => o.action?.deploymentAvailable && /deploy/.test(o.action.id));
    const play = opts.filter(o => o.kind === 'play');
    const attacks = opts.filter(o => o.kind === 'attack');
    const baseAttack = attacks.find(
      o => view.cards.find(c => c.id === o.cards[1])?.face?.kind === 'base',
    );
    let option =
      opts.find(o => o.kind === 'mulligan' && !o.takeMulligan) ??
      opts.find(o => o.kind === 'choose-mode' && o.mode === 'upgrade') ??
      opts.find(
        o => o.kind === 'target' && ['deploy', 'attach-pilot'].includes(decision.effect ?? ''),
      );
    if (pass && !option) {
      const specific = abilities.find(
        o =>
          own &&
          ((exploitScenario &&
            name(o.cards[0]) === hostLeader &&
            o.action?.id === 'leader-action' &&
            play.some(p => name(p.cards[0]) === 'hailfire-tank')) ||
            (smuggleScenario &&
              name(o.cards[0]) === hostLeader &&
              o.action?.id === 'leader-action') ||
            (baseChoicesScenario && name(o.cards[0]) === hostBase) ||
            (baseAllocationScenario &&
              name(o.cards[0]) === hostBase &&
              view.cards.filter(c => c.controller === view.activePlayer && c.face?.kind === 'unit')
                .length >= 2) ||
            (resourceLoanScenario &&
              [hostLeader, hostBase].includes(name(o.cards[0])!) &&
              !used.has(actionKey(o))) ||
            (identityScenario && o.action?.id === 'improvise') ||
            (abilityCostScenario && o.action?.id === 'break-free') ||
            (sacrificeScenario && !!o.cards[1])),
      );
      const smuggle = smuggleScenario ? play.find(o => o.smuggle) : undefined;
      const keepBuilding =
        (pilotScenario && !hasEffect('deploy')) ||
        (resourceScenario && !hasEffect('inspect-resources')) ||
        (exploitScenario && !hasEffect('exploit-payment'));
      option =
        specific ??
        smuggle ??
        deploy ??
        (keepBuilding ? undefined : baseAttack) ??
        play.find(o => !o.piloting) ??
        play[0] ??
        (keepBuilding ? undefined : attacks[0]) ??
        abilities.find(o => o.action?.id === 'leader-action') ??
        pass;
    }
    if (leaderFacesScenario && !palpatineReturned && pass) {
      const combat = attacks.find(
        o => view.cards.find(c => c.id === o.cards[1])?.face?.kind === 'unit',
      );
      option =
        (own && sidious ? play.find(o => name(o.cards[0]) === 'tie-ln-fighter') : undefined) ??
        combat ??
        play[0] ??
        abilities.find(o => o.action?.id === 'leader-action') ??
        pass;
    }
    if (victoryScenario && pass)
      option = own
        ? (play.find(o => name(o.cards[0]) === 'confidence-in-victory') ?? deploy ?? pass)
        : pass;
    if (lukeScenario && !hasEffect('replace-upgrade-defeat')) {
      const attachedLuke = view.cards.some(
        c => c.face?.cardId === 'luke-skywalker--you-still-with-me-' && c.attachedTo,
      );
      if (pass)
        option = own
          ? ((!attachedLuke ? play.find(o => !!o.piloting) : undefined) ??
            play.find(o => name(o.cards[0]) === 'red-squadron-x-wing') ??
            pass)
          : ((attachedLuke
              ? play.find(o => name(o.cards[0]) === 'outer-rim-constable')
              : undefined) ??
            play.find(o => name(o.cards[0]) === 'consular-security-force') ??
            pass);
      else
        option =
          opts.find(
            o => o.kind === 'target' && name(o.cards[0]) === 'luke-skywalker--you-still-with-me-',
          ) ?? option;
    }
    if (!option) option = opts.find(o => o.kind === 'accept-effect') ?? opts[0]!;
    const selection = decision.selection;
    let selected: string[] = [];
    if (selection) {
      if (selection.allocation) {
        const quantum = selection.allocation.quantum ?? 1;
        const total = selection.min || selection.max;
        for (let amount = 0; amount < total; amount += quantum) {
          const id = selection.cards.find(
            id =>
              selected.filter(c => c === id).length + quantum <=
              (selection.allocation!.limits[id] ?? 0),
          );
          if (!id) break;
          selected.push(...Array.from({ length: quantum }, () => id));
        }
      } else if (selection.disclose) {
        // Pick a valid small subset without consulting hidden cards or the engine.
        const choose = (at: number, picked: string[]): string[] | undefined => {
          if (picked.length >= selection.min && disclosureComplete(selection.disclose, picked))
            return picked;
          if (picked.length >= selection.max) return;
          for (let i = at; i < selection.cards.length; i++) {
            const result = choose(i + 1, [...picked, selection.cards[i]!]);
            if (result) return result;
          }
        };
        selected = choose(0, []) ?? [];
        if (!disclosureComplete(selection.disclose, selected))
          option = opts.find(o => o.kind === 'decline-effect') ?? option;
      } else {
        const wanted =
          decision.effect === 'exploit-payment'
            ? selection.max
            : Math.min(selection.max, Math.max(selection.min, 1));
        for (const id of selection.cards) {
          if (selected.length >= wanted) break;
          if (
            selection.budget &&
            selected.reduce((n, c) => n + (selection.budget!.costs[c] ?? Infinity), 0) +
              (selection.budget.costs[id] ?? Infinity) >
              selection.budget.max
          )
            continue;
          selected.push(id);
        }
      }
    }
    if (option.kind === 'decline-effect') selected = [];
    if (!cancelledAttack && option.kind === 'attack') {
      const before = driver.sentCommands;
      await driver.card(option.cards[0]!).click();
      if (await actor.locator('.cf-card-menu').count())
        await actor.locator('.cf-card-menu [data-option-kind="attack"]').click();
      await actor.locator(`[data-card-handle="${option.cards[1]}"][data-target="true"]`).waitFor();
      assert(
        driver.sentCommands === before,
        'Choosing an attacker submitted before choosing a target',
      );
      await actor.keyboard.press('Escape');
      await actor.waitForFunction(() => !document.querySelector('[data-target="true"]'));
      assert(driver.sentCommands === before, 'Cancel submitted an attack');
      cancelledAttack = true;
    }
    console.log(
      `Action ${actions}: ${decision.kind}/${decision.effect ?? ''} ${option.kind} ${name(option.cards[0]) ?? ''}`,
    );
    if (decision.effect) bump(effects, decision.effect);
    if (option.kind === 'use-ability') {
      bump(used, `${view.activePlayer}:${view.round}:${actionKey(option)}`);
      bump(used, actionKey(option));
    }
    if (option.smuggle) bump(effects, 'smuggle-play');
    if (option.exploit) bump(effects, 'exploit-play');
    await driver.choose(
      option,
      selected,
      decision.effect === 'name-card' ? 'Consular Security Force' : undefined,
    );
    if (!logChecked && actions > 15) {
      const visibleReference = host!.locator('[data-card-reference]').last();
      if (await visibleReference.count()) {
        const id = await visibleReference.getAttribute('data-card-reference');
        if (await host!.locator(`[data-card-handle="${id}"]`).count()) {
          await visibleReference.focus();
          await host!.locator(`[data-card-handle="${id}"][data-highlighted="true"]`).waitFor();
          assert(
            (await host!.locator(`[data-card-handle="${id}"][data-highlighted="true"]`).count()) ===
              1,
            'Log highlighted multiple copies',
          );
          await visibleReference.press('Enter');
          assert(
            (await host!.locator('.cf-card-inspection').count()) === 0,
            'A plain log-reference activation opened inspection',
          );
          await visibleReference.click({ button: 'right' });
          await host!.locator('.cf-inspect').waitFor();
          await host!.keyboard.press('Escape');
          await host!.locator('.cf-inspect').waitFor({ state: 'hidden' });
          logChecked = true;
        }
      }
    }
    if (
      !capturedScreens &&
      actions > 20 &&
      view.cards.filter(c => ['ground', 'space'].includes(c.zone)).length >= 3
    ) {
      await host!.evaluate(() => document.documentElement.classList.remove('dark'));
      await host!.mouse.move(0, 0);
      await sleep(750);
      await host!.screenshot({ path: '.swubase/crossfire-board-wide.png', fullPage: true });
      await spectator!.setViewportSize({ width: 390, height: 844 });
      await spectator!.evaluate(() => document.documentElement.classList.add('dark'));
      await spectator!.screenshot({ path: '.swubase/crossfire-board-mobile.png', fullPage: true });
      assert(
        await spectator!.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        'Mobile document overflows',
      );
      await spectator!.getByRole('button', { name: 'Toggle game log' }).click();
      await spectator!.getByRole('region', { name: 'Game log' }).waitFor();
      await spectator!
        .getByRole('dialog')
        .getByRole('button', { name: 'Close', exact: true })
        .click();
      capturedScreens = true;
    }
  }
  assert(actions < 350 && drivers[0]!.view?.result, 'Game failed to finish');
  assert(
    checkedPrivacy &&
      recovered &&
      inspectedCopy &&
      cancelledAttack &&
      capturedScreens &&
      logChecked,
    'Board interaction/privacy/recovery/layout gate missed',
  );
  if (exploitScenario)
    assert(
      hasEffect('exploit-payment') && hasEffect('exploit-play'),
      'Exploit browser gate missed',
    );
  if (smuggleScenario) assert(hasEffect('smuggle-play'), 'Smuggle browser gate missed');
  if (pilotScenario)
    assert(hasEffect('deploy') && hasEffect('allocate-indirect'), 'Pilot browser gate missed');
  if (resourceScenario) assert(hasEffect('inspect-resources'), 'Resource inspection gate missed');
  if (namingScenario) assert(hasEffect('name-card'), 'Card naming gate missed');
  if (inspectionScenario) assert(hasEffect('inspect-zone'), 'Private inspection gate missed');
  if (abilityCostScenario) assert(hasEffect('ability-payment'), 'Ability payment gate missed');
  if (creditScenario) assert(hasEffect('credit-payment'), 'Credit payment gate missed');
  if (discloseScenario) assert(hasEffect('disclose'), 'Disclosure gate missed');
  if (indirectScenario) assert(hasEffect('allocate-indirect'), 'Indirect damage gate missed');
  if (taxScenario) assert(hasEffect('unit-tax'), 'Unit tax gate missed');
  if (orderScenario || nabatScenario)
    assert(
      hasEffect('order-top-of-deck') || hasEffect('order-bottom-of-deck'),
      'Private ordering gate missed',
    );
  if (captureScenario) assert(captured && rescued, 'Capture/reload/rescue gate missed');
  if (leaderFacesScenario) assert(sidious && palpatineReturned, 'Leader face/reload gate missed');
  if (lukeScenario) assert(hasEffect('replace-upgrade-defeat'), 'Pilot replacement gate missed');
  if (baseAllocationScenario) assert(hasEffect('allocate-damage'), 'Base allocation gate missed');
  if (baseChoicesScenario)
    assert(
      [...used]
        .filter(([key]) => key.startsWith(hostBase + ':'))
        .reduce((n, [, count]) => n + count, 0) === 3,
      'Limited base use gate missed',
    );
  if (resourceLoanScenario)
    assert(hasEffect('inspect-zone') && hasEffect('select-resources'), 'Resource loan gate missed');
  if (identityScenario)
    assert(
      hasEffect('search-deck') && hasEffect('attack-bound'),
      'Granted search/attack gate missed',
    );
  if (plotScenario) assert(hasEffect('plot') && hasEffect('plot-play'), 'Plot gate missed');
  if (victoryScenario)
    assert(drivers[0]!.view?.result?.reason === 'card-effect', 'Card-effect victory gate missed');
  if (sacrificeScenario)
    assert(
      [...used.keys()].some(key => key.includes(hostLeader + ':')),
      'Sacrifice action gate missed',
    );
  await host!.screenshot({ path: '.swubase/crossfire-game-finished.png', fullPage: true });
  // A second invitation exercises server-disabled spectator hands, direct links,
  // back/forward navigation, and clearing the board when a live session expires.
  await host!.goto(origin + '/crossfire?cfDeck=' + users[0]!.deck);
  await host!.getByRole('button', { name: 'Create invitation', exact: true }).click();
  await host!.getByRole('heading', { name: 'Waiting for your opponent' }).waitFor();
  const privateLobbyId = new URL(host!.url()).pathname.split('/').at(-1)!;
  lobbyIds.push(privateLobbyId);
  await guest!.goto(origin + '/crossfire/' + privateLobbyId);
  await guest!.getByLabel('Or paste a deck link / ID').fill(users[1]!.deck);
  await guest!
    .getByRole('checkbox', {
      name: 'I agree to these visibility settings. Join and start the game.',
    })
    .check();
  await guest!.getByRole('button', { name: 'Join game', exact: true }).click();
  await guest!.getByRole('button', { name: 'Resync', exact: true }).waitFor();
  await spectator!.goto(origin + '/crossfire/' + privateLobbyId);
  await spectator!.locator('[data-card-handle]').first().waitFor();
  assert(
    (await spectator!.getByRole('checkbox', { name: 'Show revealed hands' }).count()) === 0,
    'Forbidden spectator toggle rendered',
  );
  await host!.locator('[data-card-handle]').first().waitFor();
  const initialActor = (await host!.locator('[data-option-kind]').count()) ? host! : guest!;
  await initialActor.locator('[data-option-kind="initiative"]').first().click();
  await host!.locator('[data-zone="hand"]').first().waitFor();
  await guest!.locator('[data-zone="hand"]').first().waitFor();
  await spectator!.reload();
  await spectator!.locator('[data-card-handle]').first().waitFor();
  assert(
    (await spectator!.locator('[data-zone="hand"]').count()) === 0,
    'Forbidden spectator hands rendered',
  );
  await spectator!.getByRole('link', { name: 'Leave board' }).click();
  await spectator!.getByRole('region', { name: 'Start a game', exact: true }).waitFor();
  await spectator!.goBack();
  await spectator!.locator('[data-card-handle]').first().waitFor();
  await sql`DELETE FROM session WHERE id = ${users[0]!.sid}`;
  await host!.getByText('Sign in again to reconnect to this game.', { exact: true }).waitFor();
  assert(
    (await host!.locator('[data-card-handle]').count()) === 0,
    'Expired session retained board',
  );
  const anonymous = await browser.newPage();
  await anonymous.goto(origin + '/crossfire');
  assert(
    (await anonymous.getByRole('button', { name: 'Create invitation', exact: true }).count()) === 0,
    'Anonymous create control rendered',
  );
  assert(pageErrors.length === 0, 'Browser errors: ' + pageErrors.join('; '));
  console.log(
    `Board game passed in ${actions} commands: card play, attacker/target clicks, cancel, exact-copy log inspection, private selections, reload, spectators, mobile, session expiry. Effects: ${JSON.stringify(Object.fromEntries(effects))}`,
  );
} catch (error) {
  for (const [i, page] of pages.entries()) {
    console.log(
      'Failure page',
      i,
      page.url(),
      (await page.locator('body').innerText()).slice(-2500),
    );
    await page.screenshot({ path: `.swubase/crossfire-failure-${i}.png`, fullPage: true });
  }
  throw error;
} finally {
  await browser.close();
  const fixtureLobbies =
    await sql`SELECT id, game_id FROM play.lobbies WHERE creator_user_id = ANY(${users.map(u => u.id)})`;
  lobbyIds.push(...fixtureLobbies.map(row => row.id));
  const leftovers = fixtureLobbies.filter(row => row.game_id);
  gameIds.push(...leftovers.map(row => row.game_id));
  await sql`DELETE FROM play.lobbies WHERE id = ANY(${lobbyIds})`;
  await sql`DELETE FROM play.games WHERE id = ANY(${gameIds})`;
  await sql`DELETE FROM deck_card WHERE deck_id = ANY(${users.map(u => u.deck)})`;
  await sql`DELETE FROM deck_information WHERE deck_id = ANY(${users.map(u => u.deck)})`;
  await sql`DELETE FROM deck WHERE id = ANY(${users.map(u => u.deck)})`;
  await sql`DELETE FROM session WHERE user_id = ANY(${users.map(u => u.id)})`;
  await sql`DELETE FROM "user" WHERE id = ANY(${users.map(u => u.id)})`;
  await sql.end();
}
