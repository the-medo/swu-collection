// Opt-in, local screenshot/interaction gallery. Real development auth and lobby
// admission; Playwright replaces only this fixture's websocket with an in-process
// original engine. Full state never enters the frontend or a browser storage API.
import { chromium, type WebSocketRoute } from 'playwright';
import postgres from 'postgres';
import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { getCookies } from 'better-auth/cookies';
import { serializeSignedCookie } from 'better-call';
import { Projector } from '../projection/projector.ts';
import { advance } from '../engine/advance.ts';
import { choose } from '../testing/helpers.ts';
import { assertState } from '../engine/state.ts';
import { scenario } from '../testing/scenario.ts';
import { galleryBoard, galleryPlay, galleryStep } from './gallery-scenarios.ts';
import {
  clientMessageSchema,
  serverMessageSchema,
  type GameView,
  type ServerMessage,
} from '../view/types.ts';
import { continuationCases } from '../testing/continuations.ts';

const database = new URL(process.env.CROSSFIRE_TEST_DATABASE_URL ?? 'http://invalid');
if (
  database.href !== process.env.DATABASE_URL ||
  database.hostname !== '127.0.0.1' ||
  !database.pathname.startsWith('/swubase_')
)
  throw new Error('Set CROSSFIRE_TEST_DATABASE_URL to the isolated running worktree DB');
const origin = process.env.BETTER_AUTH_URL!;
if (
  !['localhost', '127.0.0.1'].includes(new URL(origin).hostname) &&
  !new URL(origin).hostname.endsWith('.ts.net')
)
  throw new Error('Development origins only');
const sql = postgres(database.href, { max: 2 });
const browser = await chromium.launch({ headless: true });
const prefix = `gallery-${randomUUID()}`;
const users = [0, 1].map(n => ({ id: `${prefix}-${n}`, token: randomUUID(), deck: randomUUID() }));
const contexts = [];
const entries: { file: string; caption: string }[] = [];
const folder = '.swubase/crossfire-gallery';
await mkdir(folder, { recursive: true });
const assert = (value: unknown, message: string) => {
  if (!value) throw new Error(message);
};
try {
  for (const user of users) {
    await sql`INSERT INTO "user" (id,name,email,email_verified,created_at,updated_at,display_name,currency, role) VALUES (${user.id},'Crossfire gallery',${user.id + '@invalid.local'},false,now(),now(),${user.id},'USD', 'crossfire')`;
    await sql`INSERT INTO session (id,token,expires_at,user_id,created_at,updated_at) VALUES (${user.id},${user.token},now()+interval '1 hour',${user.id},now(),now())`;
    await sql`INSERT INTO deck (id,user_id,format,leader_card_id_1,base_card_id,name) VALUES (${user.deck},${user.id},1,'sabine-wren--galvanized-revolutionary','command-center','Crossfire gallery')`;
    await sql`INSERT INTO deck_card (deck_id,card_id,board,quantity) VALUES (${user.deck},'battlefield-marine',1,12)`;
    await sql`INSERT INTO deck_information (deck_id) VALUES (${user.deck})`;
    const context = await browser.newContext({
      viewport: { width: 1600, height: 1000 },
      reducedMotion: 'no-preference',
      hasTouch: true,
    });
    const cookie = getCookies({
      baseURL: origin,
      advanced: { cookiePrefix: process.env.BETTER_AUTH_COOKIE_PREFIX },
    }).sessionToken.name;
    const signed = (
      await serializeSignedCookie(cookie, user.token, process.env.BETTER_AUTH_SECRET!)
    ).split(';')[0]!;
    await context.addCookies([
      {
        name: cookie,
        value: signed.slice(signed.indexOf('=') + 1),
        url: origin,
        httpOnly: true,
        secure: origin.startsWith('https:'),
        sameSite: 'Lax',
      },
    ]);
    contexts.push(context);
  }
  const policy = { allowSpectators: true, handsToPlayers: false, handsToSpectators: false };
  const created = await contexts[0]!.request.post(origin + '/api/crossfire/lobbies', {
    data: { deckId: users[0]!.deck, policy },
    headers: { Origin: origin },
  });
  assert(created.ok(), `Create: ${created.status()} ${await created.text()}`);
  const lobbyId = (await created.json()).data.id;
  const joined = await contexts[1]!.request.post(
    origin + `/api/crossfire/lobbies/${lobbyId}/join`,
    { data: { deckId: users[1]!.deck, acceptedPolicy: policy }, headers: { Origin: origin } },
  );
  assert(joined.ok(), `Join: ${joined.status()} ${await joined.text()}`);
  const gameId = (await joined.json()).data.gameId;
  let state = scenario(galleryBoard(gameId)).state;
  let seat = 'p1';
  let projector = new Projector(gameId, { role: 'player', playerId: seat });
  let view: GameView = projector.project(state);
  let socket: WebSocketRoute | undefined;
  let sentCommands = 0;
  const page = await contexts[0]!.newPage();
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const send = (message: ServerMessage) =>
    socket?.send(JSON.stringify(serverMessageSchema.parse(message)));
  function publish() {
    view = projector.project(state);
    send({ type: 'snapshot', wireVersion: 1, viewer: { role: 'player', seat }, view });
  }
  await page.routeWebSocket(
    url => url.pathname.includes('/crossfire/'),
    route => {
      socket = route;
      route.onMessage(raw => {
        const message = clientMessageSchema.parse(JSON.parse(raw.toString()));
        if (message.type === 'command') {
          sentCommands++;
          state = advance(state, projector.command(state, message.command)).state;
          while (state.execution.random) {
            const random = state.execution.random;
            state = advance(state, {
              type: 'random',
              gameId,
              expectedRevision: state.revision,
              requestId: random.id,
              values: random.bounds.map(() => 0),
            }).state;
          }
          send({ type: 'ack', commandId: message.commandId, duplicate: false });
        }
        publish();
      });
    },
  );
  await page.goto(origin + '/crossfire/' + lobbyId);
  await page.locator('.cf-match').waitFor();
  const dismiss = page.getByRole('button', { name: 'Dismiss', exact: true });
  if (await dismiss.count()) await dismiss.click();
  async function ready() {
    await page.waitForFunction(
      expected =>
        document.querySelector('.cf-match')?.getAttribute('data-decision-id') ===
          expected.decision &&
        document.querySelector('.cf-match')?.getAttribute('data-view-revision') ===
          String(expected.revision) &&
        !!document.querySelector(`[data-card-handle="${expected.card}"]`),
      { decision: view.decision?.id ?? '', revision: view.revision, card: view.cards[0]?.id },
    );
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all(
        [...document.images]
          .filter(img => img.getClientRects().length > 0)
          .map(img => img.decode().catch(() => undefined)),
      );
    });
    await page.waitForTimeout(300);
  }
  async function capture(file: string, caption: string) {
    await ready();
    await page.screenshot({ path: `${folder}/${file}.png`, fullPage: true });
    entries.push({ file: `${file}.png`, caption });
    assert(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      'Horizontal page overflow',
    );
    console.log('Captured', file);
  }
  async function detail(selector: string, file: string, caption: string) {
    await ready();
    await page.locator(selector).screenshot({ path: `${folder}/${file}.png` });
    entries.push({ file: `${file}.png`, caption });
    console.log('Captured', file);
  }
  async function position(next: typeof state, player = 'p1') {
    state = next;
    seat = player;
    assertState(state);
    projector = new Projector(gameId, { role: 'player', playerId: seat });
    publish();
    await ready();
    await page.mouse.move(0, 0);
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await ready();
  assert(
    await page
      .locator('.cf-header [data-crossfire-logo] img')
      .evaluateAll(
        images =>
          images.length === 1 &&
          images.every(
            img => (img as HTMLImageElement).complete && (img as HTMLImageElement).naturalWidth > 0,
          ),
      ),
    'Game header did not load the selected Grogu logo',
  );
  const backs = page.locator('.cf-card-back img');
  assert((await backs.count()) > 0, 'The table has no default card backs');
  assert(
    await backs.evaluateAll(images =>
      images.every(img => {
        const image = img as HTMLImageElement;
        return (
          image.src ===
            'https://images.swubase.com/crossfire/card-backs/swu-default-c012e36fb016.jpg' &&
          image.complete &&
          image.naturalWidth === 216 &&
          image.naturalHeight === 302
        );
      }),
    ),
    'A face-down card did not load the shared SWU card back',
  );
  const beforeInspection = state;
  const inspectionInput = galleryBoard(gameId);
  inspectionInput.captured = [{ card: 'swoop-racer', owner: 'p2', guard: 'marine' }];
  await position(scenario(inspectionInput).state);
  const inspecting = page.locator('.cf-card-inspection');
  const inactiveCard = view.cards.find(
    c => c.face?.cardId === 'consular-security-force' && c.zone === 'ground',
  )!;
  await page.locator(`[data-card-handle="${inactiveCard.id}"]`).click();
  assert((await inspecting.count()) === 0, 'A plain click inspected an inactive card');
  const host = view.cards.find(
    c => c.zone === 'ground' && c.face?.cardId === 'battlefield-marine',
  )!;
  const beforeInspectCommands = sentCommands;
  await page.locator(`[data-card-handle="${host.id}"]`).click({ button: 'right' });
  await inspecting.waitFor();
  await capture(
    '82-inspection-related',
    'Right-click inspection includes the host, its exact upgrades, and captured cards.',
  );
  await inspecting.getByRole('button', { name: /^Inspect upgrade \d+: Academy Training$/ }).click();
  assert(
    (await inspecting.locator('.cf-inspection-image img').getAttribute('alt')) ===
      'Academy Training',
    'Related upgrade navigation lost the selected face',
  );
  await inspecting.getByRole('button', { name: /^Inspect captured \d+: Swoop Racer$/ }).click();
  assert(
    (await inspecting.locator('.cf-inspection-image img').getAttribute('alt')) === 'Swoop Racer',
    'Captured card navigation is missing',
  );
  await inspecting.getByRole('button', { name: 'Inspect previous card', exact: true }).click();
  await page.keyboard.press('ArrowRight');
  assert(
    (await inspecting.locator('.cf-inspection-image img').getAttribute('alt')) === 'Swoop Racer',
    'Keyboard inspection navigation failed',
  );
  await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 390, height: 844 });
  const heldHand = page.locator('.cf-own .cf-hand [data-card-handle]');
  const orderBeforeHold = await heldHand.evaluateAll(cards =>
    cards.map(card => card.getAttribute('data-card-handle')),
  );
  const held = heldHand.first();
  await held.focus();
  await page.waitForTimeout(250);
  const heldBox = (await held.boundingBox())!;
  const touchInspection = await page.context().newCDPSession(page);
  await touchInspection.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: heldBox.x + heldBox.width / 2, y: heldBox.y + heldBox.height / 2, id: 1 }],
  });
  await page.waitForTimeout(800);
  assert((await inspecting.count()) === 0, 'Touch inspection opened before one second');
  await inspecting.waitFor();
  await touchInspection.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await touchInspection.detach();
  await page.waitForTimeout(200);
  assert((await inspecting.count()) === 1, 'Releasing a held card closed inspection');
  assert(sentCommands === beforeInspectCommands, 'Inspection submitted a game action');
  assert(
    JSON.stringify(
      await heldHand.evaluateAll(cards => cards.map(card => card.getAttribute('data-card-handle'))),
    ) === JSON.stringify(orderBeforeHold),
    'Holding a hand card changed its order',
  );
  await capture(
    '83-touch-inspection',
    'A one-second touch hold inspects without playing the card or reordering the hand.',
  );
  await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 1600, height: 1000 });
  await position(beforeInspection);
  // Small cards must keep damage clear of both stats and token badges, even
  // when power, remaining HP and damage all have two digits.
  const initialPosition = state;
  const largeCounters = galleryBoard(gameId);
  largeCounters.players[1].ground![0]!.damage = 12;
  largeCounters.attachments!.push(
    ...Array.from({ length: 20 }, () => ({ card: 'experience', unit: 'consular' })),
    { card: 'shield', unit: 'consular' },
  );
  for (const sample of [initialPosition, scenario(largeCounters).state]) {
    await position(sample);
    for (const viewport of [
      { width: 390, height: 844 },
      { width: 844, height: 390 },
    ]) {
      await page.setViewportSize(viewport);
      await ready();
      const collisions = await page
        .locator('.cf-host-card > .cf-card:has(.cf-damage)')
        .evaluateAll(cards =>
          cards.flatMap(card => {
            const damage = card.querySelector('.cf-damage')!.getBoundingClientRect();
            const badges = [
              ...card.querySelectorAll('.cf-power, .cf-hp'),
              ...card.closest('.cf-attached-stack')!.querySelectorAll('.cf-token-overlay'),
            ];
            return badges
              .filter(badge => {
                const rect = badge.getBoundingClientRect();
                return (
                  Math.min(rect.right, damage.right) > Math.max(rect.left, damage.left) &&
                  Math.min(rect.bottom, damage.bottom) > Math.max(rect.top, damage.top)
                );
              })
              .map(badge => `${card.getAttribute('aria-label')}: ${badge.className}`);
          }),
        );
      assert(
        collisions.length === 0,
        `Damage counters overlap at ${viewport.width}×${viewport.height}: ${collisions.join('; ')}`,
      );
    }
  }
  await page.setViewportSize({ width: 1600, height: 1000 });
  await position(initialPosition);
  await capture(
    '01-table',
    'The table: orderly hands, visible resources, clockwise exhaustion, central base damage, Force and upgrade tokens.',
  );
  await detail(
    '.cf-header',
    '01d-toolbar',
    'Undo leads in yellow; Bookmark is blue. Compact utility controls and the red problem report sit at the right.',
  );
  await detail(
    '.cf-own.cf-command',
    '01a-force-credits',
    'The blue Force circle overlays the base; crossed stars indicate spent deployment.',
  );
  await detail(
    '.cf-own.cf-ground',
    '01b-upgrade-tokens',
    'Full-size upgrade strips sit beneath the host. Grouped Shield and Experience buttons overlay it; HP shows remaining health.',
  );
  await detail(
    '.cf-own.cf-space',
    '01c-advantage',
    'A black Advantage arrow sits above power. Its exact token remains inspectable.',
  );
  const resources = page.locator('.cf-own .cf-resource-row .cf-card');
  assert(
    (await resources.locator('.cf-card-art > img:visible').count()) === 0,
    'Own resources initially show faces',
  );
  await resources.first().hover({ position: { x: 5, y: 30 } });
  assert(
    (await resources.locator('.cf-card-art > img:visible').count()) === 1,
    'Hover must expose exactly one resource',
  );
  await detail(
    '.cf-own.cf-player-rail .cf-resource-row',
    '01e-resource-hover',
    'Resources stay face down; hovering reveals only that resource to its owner.',
  );
  await page.mouse.move(0, 0);
  await resources.first().focus();
  await page.keyboard.press('ArrowRight');
  await resources.last().hover();
  assert(
    (await resources.locator('.cf-card-art > img:visible').count()) === 1,
    'Hover and keyboard focus exposed two resource faces',
  );
  await resources.first().focus();
  await resources.first().click();
  await page.locator('.cf-pile-dialog').waitFor();
  assert(
    (await page.locator('.cf-pile-dialog .cf-card-art > img').count()) === 12,
    'Resource inspection missing permitted faces',
  );
  await capture(
    '01f-resource-inspection',
    'Click a resource or its counter to inspect all your resources together.',
  );
  await page.keyboard.press('Escape');
  await page.mouse.move(0, 0);
  const enemyResources = page.locator('.cf-opponent .cf-resource-row .cf-card');
  await enemyResources.first().hover({ position: { x: 5, y: 30 } });
  assert(
    (await enemyResources.locator('.cf-card-art > img').count()) === 0,
    'Opponent resource face leaked',
  );
  assert(
    await enemyResources.first().locator('.cf-card-back img').isVisible(),
    'Hover hid the back of a secret resource',
  );
  await enemyResources.first().click();
  await page.locator('.cf-pile-dialog').waitFor();
  assert(
    (await page.locator('.cf-pile-dialog .cf-card-art > img').count()) === 0,
    'Opponent resource dialog leaked faces',
  );
  await page.keyboard.press('Escape');
  await page.mouse.move(0, 0);
  assert((await page.locator('.cf-copy').count()) === 0, 'Visible copy numbers remain');
  assert(
    (await page.locator('.cf-epic-marker[data-spent="false"]').count()) === 0,
    'Unused Epic marker remains',
  );
  const marine = view.cards.find(
    c => c.controller === 'p1' && c.face?.cardId === 'battlefield-marine' && c.zone === 'ground',
  )!;
  assert(
    (await page.locator(`[data-card-handle="${marine.id}"] .cf-hp`).textContent()) ===
      String(marine.face!.hp! - marine.damage),
    'Unit HP is not remaining HP',
  );
  assert(
    await page
      .locator('.cf-card-landscape .cf-damage')
      .evaluateAll(badges =>
        badges.every(b => b.scrollWidth <= b.clientWidth && b.scrollHeight <= b.clientHeight),
      ),
    'Base damage overflows its box',
  );
  const shields = page.locator('.cf-own .cf-overlay-shield [data-token-handles]');
  const exactShields = (await shields.getAttribute('data-token-handles'))!.split(' ');
  await shields.click();
  assert(
    JSON.stringify(
      await page
        .locator('.cf-token-choices [data-card-handle]')
        .evaluateAll(cards => cards.map(c => c.getAttribute('data-card-handle'))),
    ) === JSON.stringify(exactShields),
    'Grouped tokens lost exact physical identities',
  );
  await capture(
    '01g-token-copies',
    'A stack shows one icon and a count. Open it to inspect or select an individual physical token.',
  );
  await page.keyboard.press('Escape');
  const attackSource = view.cards.find(
    c => c.controller === 'p1' && c.face?.cardId === 'red-squadron-x-wing' && c.zone === 'space',
  )!;
  await page.locator(`[data-card-handle="${attackSource.id}"]`).click();
  assert(
    (await page.locator('[data-target="true"]').count()) >= 2,
    'Attacking did not expose legal targets',
  );
  await capture(
    '01d-attack-targets',
    'Click an attacker, then a highlighted enemy unit or base. Selecting the attacker has not yet committed an attack.',
  );
  await page.keyboard.press('Escape');
  const hand = page.locator('.cf-own .cf-hand [data-card-handle]');
  const hoverArea = (await page.locator('.cf-own [data-hand-card]').first().boundingBox())!;
  await page.mouse.move(hoverArea.x + 12, Math.min(hoverArea.y + hoverArea.height - 8, 994));
  await page.waitForTimeout(700);
  const firstHover = await hand.first().boundingBox();
  await page.waitForTimeout(500);
  const secondHover = await hand.first().boundingBox();
  assert(
    firstHover &&
      secondHover &&
      firstHover.width > 150 &&
      Math.abs(firstHover.y - secondHover.y) < 2,
    'Hand hover is not stable or does not lift the full card',
  );
  await page.mouse.move(0, 0);
  const before = await hand.evaluateAll(cards =>
    cards.map(c => c.getAttribute('data-card-handle')),
  );
  const commandsBefore = sentCommands;
  await hand.nth(2).focus();
  await page.keyboard.press('Alt+ArrowLeft');
  assert(
    (await hand.nth(1).getAttribute('data-card-handle')) === before[2],
    'Keyboard reorder failed',
  );
  assert(sentCommands === commandsBefore, 'Reorder sent a game command');
  await capture(
    '02-hand-hover',
    'A focused hand card lifts out of the fan so its complete text is readable. Alt + arrows reorder it locally.',
  );
  await page.locator('.cf-header').click({ position: { x: 5, y: 5 } });
  async function dragHand(touch: boolean) {
    const beforeDrag = await hand.evaluateAll(cards =>
      cards.map(c => c.getAttribute('data-card-handle')),
    );
    const source = hand.first();
    await source.focus();
    await page.waitForTimeout(250);
    const box = (await source.boundingBox())!;
    const destination = await page
      .locator('.cf-own [data-hand-card]')
      .nth(3)
      .evaluate(slot => {
        const parent = slot.parentElement!;
        return (
          parent.getBoundingClientRect().x +
          (slot as HTMLElement).offsetLeft -
          parent.offsetLeft +
          (slot.querySelector('.cf-card') as HTMLElement).offsetWidth / 2
        );
      });
    const from = { x: box.x + box.width / 2, y: Math.min(box.y + box.height / 2, 980) };
    const session = touch ? await page.context().newCDPSession(page) : null;
    if (session)
      await session.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [{ ...from, id: 1 }],
      });
    else {
      await page.mouse.move(from.x, from.y);
      await page.mouse.down();
    }
    for (let i = 1; i <= 12; i++) {
      const x = from.x + ((destination - from.x) * i) / 12;
      if (session)
        await session.send('Input.dispatchTouchEvent', {
          type: 'touchMove',
          touchPoints: [{ x, y: from.y, id: 1 }],
        });
      else await page.mouse.move(x, from.y);
      await page.waitForTimeout(25);
      const dragged = (await source.boundingBox())!;
      assert(
        Math.abs(dragged.x + dragged.width / 2 - x) < box.width / 2 + 20,
        `${touch ? 'Touch' : 'Mouse'} drag preview drifted away from the pointer`,
      );
    }
    await capture(
      touch ? '03b-hand-drag-touch' : '03a-hand-drag-mouse',
      'The dragged card follows the pointer without drifting off screen.',
    );
    if (session) {
      await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await session.detach();
    } else await page.mouse.up();
    assert(
      (await hand.nth(3).getAttribute('data-card-handle')) === beforeDrag[0],
      `${touch ? 'Touch' : 'Mouse'} drag reorder failed`,
    );
    assert(sentCommands === commandsBefore, 'Dragging sent a game command');
  }
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await dragHand(false);
  await dragHand(true);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.locator('.cf-header').click({ position: { x: 5, y: 5 } });
  await page.mouse.move(0, 0);
  await capture(
    '03-hand-order',
    'Hand order after real mouse and touch drags. Dragging only changes local order; tapping still plays a card.',
  );
  // Touch cancellation must not reorder or submit; a subsequent tap must still play.
  const cancelledOrder = await hand.evaluateAll(cards =>
    cards.map(c => c.getAttribute('data-card-handle')),
  );
  await hand.first().focus();
  await page.waitForTimeout(250);
  const touchBox = (await hand.first().boundingBox())!;
  const touchPoint = {
    x: touchBox.x + touchBox.width / 2,
    y: Math.min(touchBox.y + touchBox.height / 2, 980),
    id: 1,
  };
  const touchSession = await page.context().newCDPSession(page);
  await touchSession.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [touchPoint],
  });
  await touchSession.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ ...touchPoint, x: touchPoint.x + 90 }],
  });
  await touchSession.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  await touchSession.detach();
  assert(
    JSON.stringify(
      await hand.evaluateAll(cards => cards.map(c => c.getAttribute('data-card-handle'))),
    ) === JSON.stringify(cancelledOrder),
    'Cancelled touch changed order',
  );
  assert(sentCommands === commandsBefore, 'Cancelled touch played a card');
  await page.waitForTimeout(250);
  const tapBox = (await hand.first().boundingBox())!;
  await page.touchscreen.tap(
    tapBox.x + tapBox.width / 2,
    Math.min(tapBox.y + tapBox.height / 2, 980),
  );
  await ready();
  assert(sentCommands === commandsBefore + 1, 'A tap after a cancelled drag did not play the card');
  await position(galleryPlay(gameId, 'garindan--information-broker'));
  const arenaBefore = await page.locator('.cf-arena').first().boundingBox();
  await capture(
    '04-name-card',
    'Garindan uses a compact floating title selector and confirmation button; the arenas retain their height.',
  );
  await page.getByRole('combobox', { name: 'Name a card', exact: true }).click();
  await page.getByRole('combobox', { name: 'Search card titles', exact: true }).fill('consular');
  assert(
    await page.getByRole('button', { name: 'Confirm name' }).isDisabled(),
    'Typing a filter enabled naming without selecting a title',
  );
  await capture(
    '05-name-picker',
    'Search official titles, then select an exact name. Typed spelling is never submitted as the card name.',
  );
  await page.getByRole('option', { name: 'Consular Security Force', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm name', exact: true }).click();
  await ready();
  assert(view.decision?.effect === 'inspect-zone', 'Naming did not advance through the engine');
  const arenaAfter = await page.locator('.cf-arena').first().boundingBox();
  assert(arenaBefore?.height === arenaAfter?.height, 'Effect choice resized an arena');
  await capture(
    '06-private-choice',
    'The ability reveals only its authorized hand selection in a compact tray; ordinary opponent resources remain hidden.',
  );
  await position(galleryPlay(gameId, 'sense-through-the-force'));
  const numberInput = page.getByRole('spinbutton', { name: 'Choose a number', exact: true });
  assert(
    await page.getByRole('button', { name: 'Confirm number' }).isDisabled(),
    'An empty number was submittable',
  );
  await numberInput.fill('-1');
  assert(
    await page.getByRole('button', { name: 'Confirm number' }).isDisabled(),
    'A negative number was submittable',
  );
  await numberInput.fill('0.5');
  assert(
    await page.getByRole('button', { name: 'Confirm number' }).isDisabled(),
    'A fractional number was submittable',
  );
  await numberInput.fill('2');
  await capture(
    '28-sense-number',
    'Sense Through the Force chooses a number before showing the private top five cards.',
  );
  await numberInput.press('Enter');
  await ready();
  assert(
    view.decision?.effect === 'search-deck',
    'Enter did not submit the number through the engine',
  );
  await capture(
    '29-sense-search',
    'The chosen number is public; only the searching player sees these five cards.',
  );
  const wipeInput = galleryBoard(gameId);
  wipeInput.players[0].credits = [];
  wipeInput.players[0].hand = [{ card: 'wipe-them-out', ref: 'event' }];
  wipeInput.players[0].ground = [{ card: 'consular-security-force', ref: 'attacker' }];
  wipeInput.players[1].ground = [
    { card: 'death-star-stormtrooper', ref: 'defender' },
    { card: 'battlefield-marine', ref: 'extra' },
  ];
  wipeInput.attachments = [];
  const wg = scenario(wipeInput);
  let ws = galleryStep(wg.state, i => i.kind === 'play' && i.card === wg.refs.event);
  ws = galleryStep(
    ws,
    i => i.kind === 'attack' && i.attacker === wg.refs.attacker && i.defender === wg.refs.defender,
  );
  await position(ws);
  await capture(
    '30-wipe-excess',
    'Wipe Them Out selects its excess-damage recipient directly on the board. Combat has not committed yet.',
  );
  const excessTarget = view.cards.find(
    c => c.face?.cardId === 'battlefield-marine' && c.controller === 'p2' && c.zone === 'ground',
  )!;
  await page.locator(`[data-card-handle="${excessTarget.id}"]`).first().click();
  await ready();
  assert(
    state.cards[wg.refs.extra!]!.damage === 2,
    'Clicking an excess target did not resolve combat damage',
  );
  await capture(
    '31-wipe-resolved',
    'The primary defender is defeated and the clicked unit takes two combat damage.',
  );
  await position(galleryPlay(gameId, 'lawbringer--shadow-over-lothal'));
  await capture(
    '07-aspect-choice',
    'Lawbringer presents its six aspect choices in a small floating dialog.',
  );
  assert(
    (await page.locator('.cf-aspect-options button img').count()) === 6,
    'Aspect choices are missing their icons',
  );
  assert(
    (await page.getByRole('button', { name: 'Vigilance', exact: true }).count()) === 1,
    'Aspect icon button has no accessible name',
  );
  const baseInput = galleryBoard(gameId);
  baseInput.players[0].credits = [];
  let epic = scenario(baseInput).state;
  epic = galleryStep(epic, i => i.kind === 'use-ability' && i.card === epic.players.p1!.base);
  await position(epic);
  await capture(
    '08-epic-spent',
    'The base Epic Action has been spent; the panel asks which card to play. The returned leader also retains its spent deployment.',
  );
  assert(
    view.cards
      .filter(c => c.controller === 'p1')
      .flatMap(c => c.limitedActions)
      .filter(a => a.used >= a.max).length === 2,
    'Base/leader spent markers missing',
  );
  await page.getByRole('button', { name: 'Hide choice to see the board' }).click();
  await detail(
    '.cf-command.cf-own',
    '08a-epic-detail',
    'Grey crossed stars mark the spent base Epic Action and spent leader deployment. Unused actions have no star; legality still comes from the current decision.',
  );
  const continuations = continuationCases();
  for (const [index, match, caption] of [
    [
      'ibh-01',
      'ibh-reveal-draw',
      'IBH: choose a revealed unit to draw; the other revealed cards go to discard.',
    ],
    [
      'ibh-02',
      'ibh-two-targets',
      'IBH: choose two distinct enemy units directly on the battlefield.',
    ],
    [
      'ibh-03',
      'ibh-after-sacrifice',
      'IBH: ready a surviving friendly unit after the chosen sacrifice was defeated.',
    ],
    [
      '09',
      'last-power-allocation',
      'Distribute Advantage tokens while the battlefield remains available for selecting targets.',
    ],
    [
      '10',
      'piloting-trigger',
      'A pilot is attached beneath its vehicle; the pending ability remains separate from the board layout.',
    ],
    [
      '11',
      'private-search',
      'A private deck search presents the permitted cards without exposing the rest of the deck.',
    ],
    [
      '15',
      'indirect-outcome',
      'Indirect damage is assigned directly to units and bases; their remaining capacity controls the limit.',
    ],
    [
      '16',
      'executioner-pairs',
      'An effect that assigns damage in pairs: each click adds the required two damage.',
    ],
    [
      '17',
      'memorial-experience',
      'Experience distribution uses the same card clicks and on-card counters.',
    ],
    [
      '33',
      'sec-droid-resource-payment',
      'Vuutun Palaa permits ready Droid units to exhaust toward resource costs. Click a Droid on the board and confirm the payment.',
    ],
    [
      '35',
      'sec-resource-subset-inspection',
      'Elia Kane shows only the three selected enemy resource faces to her controller.',
    ],
    [
      '36',
      'sec-simultaneous-capture-pairs',
      'Let’s Talk chooses the final prisoner before committing all captures together.',
    ],
    [
      '37',
      'sec-sequential-unit-attacks',
      'Mon Mothma lets you choose the next attacker after the previous attack finishes.',
    ],
    [
      '42',
      'lof-combined-power-selection',
      'Mind Trick selects units on the board within a combined power limit.',
    ],
    [
      '43',
      'lof-search-top-order',
      'Following the Path privately orders the two revealed Force units on top of the deck.',
    ],
    [
      '44',
      'lof-repeat-played-after-departure',
      'Aethersprite offers to repeat the next When Played ability even after the ship has left play.',
    ],
    [
      '45',
      'lof-private-drawn-reveal',
      'Rey offers a private choice to reveal the exact drawn card or keep it hidden.',
    ],
    [
      '46',
      'lof-foreseen-private-look',
      'As I Have Foreseen privately inspects the top card before Force use.',
    ],
    [
      '47',
      'lof-returned-count-targets',
      'Luminous Beings selects distinct units after returning Force units to the deck.',
    ],
    [
      '48',
      'jtl-fleet-keyword',
      'Yularen chooses the keyword granted to friendly Vehicles, including future plays.',
    ],
    ['49', 'jtl-poe-convert', 'Click the new X-Wing to have Poe pilot it.'],
    [
      '50',
      'jtl-l3-host-choice',
      'L3-37 can replace her defeat by becoming an upgrade on a friendly Vehicle without a Pilot.',
    ],
    [
      '51',
      'jtl-caster-repeat',
      'Shadow Caster offers to use all captured When Defeated abilities again.',
    ],
    [
      '52',
      'jtl-jump-attachments',
      'Jump to Lightspeed selects which upgrades return alongside the ship. They leave together before checking lost HP.',
    ],
    [
      '53',
      'jtl-free-copy-choice',
      'The next copy offers free or normal payment. Cancel play restores the declaration and keeps the free-play opportunity.',
    ],
    [
      '54',
      'jtl-half-credit-payment',
      'The Starhawk halves this payment from two resources to one. A single Credit can satisfy it.',
    ],
    [
      '55',
      'jtl-conversion-cleanup',
      'Luke can replace his upgrade defeat before Phantom II finishes docking to The Ghost.',
    ],
    [
      '38',
      'sec-after-damage-condition',
      'Choose Vigil’s prevention or the Shield before AAT checks whether a friendly unit was actually damaged.',
    ],
  ] as const) {
    const fixture = continuations.find(c => c.name === match);
    if (!fixture) {
      console.log(
        'Available gallery continuation names',
        continuations.map(c => c.name),
      );
      throw new Error(`Missing ${match}`);
    }
    function remap(next: typeof state): typeof state {
      const converted: typeof state = JSON.parse(
        JSON.stringify(next).replaceAll('"alice"', '"p1"').replaceAll('"bob"', '"p2"'),
      );
      converted.gameId = gameId;
      // Payment cancellation contains a serialized earlier state. Keep its game
      // and seats consistent with this fixture as well as the visible position.
      if (converted.playPayment)
        converted.playPayment.rollback = JSON.stringify(
          remap(JSON.parse(converted.playPayment.rollback)),
        );
      return converted;
    }
    const converted = remap(fixture.state);
    await position(converted, converted.execution.decision?.playerId ?? 'p1');
    if (['indirect-outcome', 'executioner-pairs', 'memorial-experience'].includes(match)) {
      const selection = view.decision!.selection!;
      const quantum = selection.allocation!.quantum ?? 1;
      const eligible = selection.cards.filter(id => selection.allocation!.limits[id]! >= quantum);
      const target =
        eligible.find(id => view.cards.find(c => c.id === id)?.face?.kind === 'base') ??
        eligible[0]!;
      await page.locator(`[data-card-handle="${target}"]`).click();
      const controls = page.locator(`[data-assignment-card="${target}"] .cf-assignment-controls`);
      assert(
        (await controls.locator('output').textContent()) === String(quantum),
        'Allocation ignored its required increment',
      );
      if (match === 'indirect-outcome') {
        await page.setViewportSize({ width: 390, height: 844 });
        await capture(
          '15a-mobile-assignment',
          'Touch-sized plus/minus buttons stay on each target, with compact confirmation between the arenas.',
        );
        await page.setViewportSize({ width: 1600, height: 1000 });
      }
    }
    await capture(`${index}-${match}`, caption);
    if (match === 'ibh-two-targets') {
      for (const id of view.decision!.selection!.cards)
        await page.locator(`[data-card-handle="${id}"]`).click();
      await page.getByRole('button', { name: 'Use this effect', exact: true }).click();
      await ready();
      assert(
        state.ground
          .filter(id => state.cards[id]!.controller === 'p2')
          .every(id => state.cards[id]!.damage === 1),
        'IBH on-board target selection did not damage both exact units',
      );
      await capture(
        'ibh-02a-applied-damage',
        'Both selected enemy copies receive one damage after confirming the on-board selection.',
      );
    }

    if (match === 'jtl-poe-convert' || match === 'jtl-l3-host-choice') {
      const printed =
        match === 'jtl-poe-convert'
          ? 'poe-dameron--one-hell-of-a-pilot'
          : 'l3-37--get-out-of-my-seat';
      const card = Object.values(state.cards).find(c => c.cardId === printed)!;
      const incarnation = card.incarnation;
      const target = view.decision!.options.find(o => o.kind === 'target')!.cards[0]!;
      await page.locator(`[data-card-handle="${target}"]`).click();
      await ready();
      assert(state.cards[card.instanceId]!.attachedTo, 'Card click did not attach the Pilot');
      assert(
        state.cards[card.instanceId]!.incarnation === incarnation,
        'Conversion created a new copy',
      );
      await capture(
        `${index}a-jtl-pilot-attached`,
        'The selected Pilot is now attached beneath the Vehicle, keeping the same card identity.',
      );
    }
    if (match === 'jtl-free-copy-choice') {
      const sourceId = state.playPayment!.source.instanceId;
      await page.getByRole('button', { name: 'Cancel play', exact: true }).click();
      await ready();
      assert(state.playPayment === null, 'Cancellation kept the payment continuation');
      assert(state.cards[sourceId]!.zone === 'hand', 'Cancellation lost the returned unit');
      assert(
        state.playModifiers.some(m => m.optionalFreeCopy),
        'Cancellation consumed free play',
      );
      await position(remap(fixture.state));
      await page.getByRole('button', { name: 'Play for free', exact: true }).click();
      await ready();
      assert(state.cards[sourceId]!.zone === 'space', 'Free play did not put the ship in space');
      assert(state.cards[sourceId]!.resourcesPaid === 0, 'Free play spent resources');
      await capture(
        '53a-jtl-free-copy-played',
        'The returned ship is back in space with no resources paid.',
      );
      await position(remap(fixture.state));
      const readyBefore = state.players.p1!.resources.filter(
        id => !state.cards[id]!.exhausted,
      ).length;
      await page.getByRole('button', { name: 'Pay cost', exact: true }).click();
      await ready();
      assert(state.cards[sourceId]!.zone === 'space', 'Normal payment did not play the ship');
      assert(
        state.cards[sourceId]!.resourcesPaid === 7,
        'Normal payment missed the aspect penalty',
      );
      assert(
        state.players.p1!.resources.filter(id => !state.cards[id]!.exhausted).length ===
          readyBefore - 7,
        'Normal payment spent the wrong resources',
      );
      await position(remap(fixture.state));
      await page.setViewportSize({ width: 390, height: 844 });
      await capture(
        '53b-jtl-mobile-free-copy',
        'Free, normal and cancel choices remain available on a narrow screen.',
      );
      await page.setViewportSize({ width: 1600, height: 1000 });
    }
    if (match === 'sec-droid-resource-payment') {
      const droid = view.cards.find(c => c.face?.cardId === 'battle-droid')!;
      await page.locator(`[data-card-handle="${droid.id}"]`).click();
      await page.setViewportSize({ width: 390, height: 844 });
      await capture(
        '34a-mobile-droid-payment',
        'Droid payment selection and confirmation on a narrow screen.',
      );
      await page.setViewportSize({ width: 1600, height: 1000 });
      await page.locator(`[data-option-id="${view.decision!.options[0]!.id}"]`).click();
      await ready();
      assert(
        view.cards.find(c => c.face?.cardId === 'battle-droid')?.exhausted,
        'Droid payment did not exhaust the selected unit',
      );
      await capture(
        '34-paid-with-droid',
        'The selected Droid is exhausted, the played card enters its arena, and the other resource costs are paid.',
      );
    }
    if (match === 'last-power-allocation') {
      assert((await page.locator('.cf-choice-dialog').count()) === 0, 'Allocation opened a dialog');
      assert(
        (await page.getByRole('spinbutton').count()) === 0,
        'Allocation still uses a number form',
      );
      const selection = view.decision!.selection!;
      const target = selection.cards[0]!;
      const controls = page.locator(`[data-assignment-card="${target}"] .cf-assignment-controls`);
      await page.locator(`[data-card-handle="${target}"]`).click();
      assert(
        (await controls.locator('output').textContent()) === '1',
        'Clicking did not assign to the exact target',
      );
      await controls.getByRole('button').first().click();
      assert(
        (await controls.locator('output').textContent()) === '0',
        'Minus failed to remove assignment',
      );
      assert(
        await controls.getByRole('button').first().isDisabled(),
        'Minus allows negative allocation',
      );
      for (let i = 0; i < selection.max; i++) await controls.getByRole('button').last().click();
      assert(await controls.getByRole('button').last().isDisabled(), 'Plus exceeds allocation cap');
      const second = selection.cards[1]!;
      const secondControls = page.locator(
        `[data-assignment-card="${second}"] .cf-assignment-controls`,
      );
      assert(
        await secondControls.getByRole('button').last().isDisabled(),
        'Another target exceeded the shared allocation cap',
      );
      for (let i = 0; i < 3; i++) {
        await controls.getByRole('button').first().click();
        await page.locator(`[data-card-handle="${second}"]`).click();
      }
      assert(
        (await secondControls.locator('output').textContent()) === '3',
        'Click-again did not add to the second target',
      );
      await capture(
        '09a-assigned-target',
        'Click targets to assign, then adjust with plus or minus on each card. The counter and confirmation stay on the board.',
      );
      const oldDecision = view.decision!.id;
      await page.locator(`[data-option-id="${view.decision!.options[0]!.id}"]`).click();
      await ready();
      assert(
        view.decision?.id !== oldDecision,
        'Board assignment did not resolve through the engine',
      );
    }
  }
  await position(scenario(galleryBoard(gameId)).state);
  await page.setViewportSize({ width: 390, height: 844 });
  await capture(
    '12-mobile-table',
    'Compact counts replace resource rows; hands share the rails and smaller units leave room for multiple cards.',
  );
  assert(
    (await page.locator('.cf-resource-row:visible').count()) === 0,
    'Mobile resource images still consume rail space',
  );
  const mobileArena = page.locator('.cf-arena.cf-ground.cf-opponent');
  const arenaBox = (await mobileArena.boundingBox())!;
  const visibleUnits = await mobileArena.locator('.cf-host-card > .cf-card').evaluateAll(
    (cards, box) =>
      cards.filter(card => {
        const rect = card.getBoundingClientRect();
        return (
          rect.left >= box.x &&
          rect.right <= box.x + box.width &&
          rect.top >= box.y &&
          rect.bottom <= box.y + box.height
        );
      }).length,
    arenaBox,
  );
  assert(visibleUnits >= 2, 'Mobile arena does not show multiple units');
  await page.getByRole('button', { name: /^You resources ·/ }).click();
  assert(
    (await page.locator('.cf-pile-dialog .cf-card').count()) > 0,
    'Hidden mobile resources cannot be inspected',
  );
  await page.getByRole('button', { name: 'Back to board', exact: true }).click();
  await page.setViewportSize({ width: 844, height: 390 });
  await capture(
    '12a-mobile-landscape',
    'Landscape mobile keeps both hands, resource counts and the two arenas inside the screen.',
  );
  assert(
    await page.evaluate(
      () => document.querySelector('.cf-game')!.getBoundingClientRect().bottom <= innerHeight,
    ),
    'Landscape board overflows the viewport',
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await position(galleryPlay(gameId, 'lawbringer--shadow-over-lothal'));
  await capture('13-mobile-choice', 'A compact aspect selection on mobile.');
  await page.setViewportSize({ width: 1600, height: 1000 });
  const captured = galleryBoard(gameId);
  captured.captured = [{ card: 'swoop-racer', owner: 'p1', guard: 'consular', ref: 'captive' }];
  await position(scenario(captured).state);
  const captiveCard = view.cards.find(c => c.zone === 'captured')!;
  const captiveButton = page.locator(`[data-card-handle="${captiveCard.id}"]`);
  const captiveBox = (await captiveButton.boundingBox())!;
  const guardBox = (await page
    .locator(`[data-card-handle="${captiveCard.capturedBy}"]`)
    .boundingBox())!;
  assert(
    captiveBox.width > captiveBox.height &&
      captiveBox.x < guardBox.x &&
      captiveBox.x + captiveBox.width > guardBox.x + guardBox.width,
    'Captured card is not sideways behind its guard',
  );
  assert(
    !(await captiveButton.locator('.cf-card-art > img').isVisible()),
    'Captured card is not face down',
  );
  await capture(
    '14-captured-unit',
    'The face-down captive sits sideways behind its guard, with both edges visible.',
  );
  await page.mouse.move(captiveBox.x + 5, captiveBox.y + captiveBox.height / 2);
  await captiveButton.locator('.cf-card-art > img').waitFor({ state: 'visible' });
  await capture(
    '14a-captured-hover',
    'Hover either exposed edge to reveal the captured card. Its identity is public.',
  );
  await page.mouse.move(0, 0);
  const hondoBoard = galleryBoard(gameId);
  hondoBoard.players[0].credits = [];
  hondoBoard.players[0].ground!.push({
    card: 'hondo-ohnaka--plays-by-his-own-rules',
    ref: 'hondo',
  });
  const hondoGame = scenario(hondoBoard);
  const hondoTop = hondoGame.state.players.p1!.deck[0]!;
  await position(hondoGame.state);
  assert(view.privateDeckTop?.face.cardId === 'battlefield-marine', 'Hondo private top missing');
  await capture(
    '30-hondo-deck-top',
    'Hondo reveals the current top of your deck only to you. Right-click or hold it to inspect.',
  );
  await page.getByRole('button', { name: /Inspect top of your deck:/ }).click();
  assert(
    (await page.locator('.cf-card-inspection').count()) === 0,
    'A plain deck-top click opened inspection',
  );
  await page.getByRole('button', { name: /Inspect top of your deck:/ }).click({ button: 'right' });
  await capture(
    '31-hondo-inspection',
    'Inspecting the privately visible top card before deciding whether to use Hondo.',
  );
  await page.keyboard.press('Escape');
  const hondoHandle = view.cards.find(
    c => c.face?.cardId === 'hondo-ohnaka--plays-by-his-own-rules',
  )!.id;
  await page.locator(`[data-card-handle="${hondoHandle}"]`).click();
  const hondoUse = view.decision!.options.find(
    option => option.kind === 'use-ability' && option.cards[0] === hondoHandle,
  )!;
  await page.locator(`[data-option-id="${hondoUse.id}"]`).click();
  await ready();
  assert(view.decision?.effect === 'play-card', 'Hondo action did not offer its top-card play');
  await capture(
    '32-hondo-play',
    'The top card is played at its normal cost. Hondo can use this action once per round.',
  );
  const topPlay = view.decision!.options.find(o => o.kind === 'play')!;
  await page.locator(`[data-card-handle="${topPlay.cards[0]}"]`).click();
  await ready();
  assert(
    state.roundHistory.actionUses.some(use => use.source.instanceId === hondoGame.refs.hondo),
    'Hondo use not recorded',
  );
  assert(
    state.cards[hondoTop]!.zone === 'ground',
    'Clicking the inspected top card did not play it',
  );
  await position(hondoGame.state, 'p2');
  assert(view.privateDeckTop === null, 'Hondo private top leaked to opponent');
  assert(
    (await page.getByRole('button', { name: /Inspect top of your deck:/ }).count()) === 0,
    'Opponent can inspect Hondo deck',
  );
  assert(errors.length === 0, errors.join('\n'));
  // Board polish: resolve trigger batches directly from compact, illustrated rows.
  await position(galleryPlay(gameId, 'shuttle-st-149--under-krennic-s-authority'));
  assert(
    (await page.locator('.cf-trigger-options [data-option-kind="trigger"]').count()) === 2,
    'Shuttle trigger rows are not immediately visible',
  );
  await capture(
    '66-shuttle-triggers',
    'Shielded and When Played are immediately available as illustrated rows.',
  );
  await detail(
    '.cf-choice-dialog',
    '66a-trigger-detail',
    'Every trigger has a source image and a short description.',
  );
  const many = galleryBoard(gameId);
  many.players[0].leader = { card: 'grogu--charming-companion' };
  many.players[0].ground = [{ card: 'cobb-vanth--let-me-handle-this' }];
  many.players[0].hand = [
    { card: 'shien-flurry', ref: 'flurry' },
    { card: 'anakin-skywalker--champion-of-mortis', ref: 'anakin' },
  ];
  many.players[0].discard = [{ card: 'battlefield-marine' }, { card: 'death-star-stormtrooper' }];
  many.players[0].resources!.forEach(c => {
    c.exhausted = false;
  });
  many.players[0].credits = [];
  many.attachments = [];
  let multi = scenario(many);
  let multiState = galleryStep(multi.state, i => i.kind === 'play' && i.card === multi.refs.flurry);
  multiState = galleryStep(multiState, i => i.kind === 'play' && i.card === multi.refs.anakin);
  await position(multiState);
  assert(
    (await page.locator('.cf-trigger-options [data-option-kind="trigger"]').count()) === 5,
    'Expected five independently selectable triggers',
  );
  await page.getByRole('button', { name: /^Deploy Grogu ·/ }).waitFor();
  await capture(
    '67-five-trigger-choices',
    'Grogu, Ambush, Cobb Vanth and both Anakin When Played abilities appear together.',
  );
  await detail(
    '.cf-choice-dialog',
    '67a-five-trigger-detail',
    'Five compact rows retain the two different Anakin conditions.',
  );
  await page.setViewportSize({ width: 430, height: 900 });
  await capture(
    '67b-five-triggers-mobile',
    'The trigger choices remain readable and scrollable on touch screens.',
  );
  await page.setViewportSize({ width: 1600, height: 1000 });
  const ahsoka = galleryBoard(gameId);
  ahsoka.players[0].leader = { card: 'ahsoka-tano--trust-in-the-force', ref: 'ahsoka' };
  ahsoka.players[0].resources = ahsoka.players[0].resources!.slice(0, 4);
  const leader = scenario(ahsoka);
  await position(leader.state);
  const leaderCard = view.cards.find(c => c.face?.cardId === 'ahsoka-tano--trust-in-the-force')!;
  const beforeLeader = sentCommands;
  await page.locator(`[data-card-handle="${leaderCard.id}"]`).click();
  await ready();
  assert(sentCommands === beforeLeader + 1, 'Sole leader action required another click');
  await page
    .getByText(
      'Choose a unit with less power than a friendly unit. It gets +2/+0 for this phase.',
      { exact: true },
    )
    .waitFor();
  await capture(
    '68-ahsoka-target-text',
    'A single click uses Ahsoka’s available action; the target prompt explains the ability.',
  );
  const koska = galleryBoard(gameId);
  koska.players[0].ground = [
    { card: 'koska-reeves--warrior-of-mandalore' },
    { card: 'mandalorian' },
  ];
  koska.attachments = [];
  await position(scenario(koska).state);
  assert(
    (await page.locator('[data-sentinel="true"]').count()) > 0,
    'Conditional Sentinel was not indicated',
  );
  await capture(
    '69-koska-sentinel-active',
    'Koska displays Sentinel while her controller has a token unit.',
  );
  koska.players[0].ground.pop();
  await position(scenario(koska).state);
  assert(
    (await page.locator('[data-sentinel="true"]').count()) === 0,
    'Conditional Sentinel remained active without a token',
  );
  await capture(
    '69a-koska-sentinel-inactive',
    'The Sentinel indicator disappears when its condition is not met.',
  );
  const resourceState = galleryStep(
    galleryStep(scenario(galleryBoard(gameId)).state, 'pass'),
    'pass',
  );
  await position(resourceState, 'p2');
  await capture(
    '70-resource-early-choice',
    'The second player may select and confirm resources while the initiative player is choosing.',
  );
  const resource = view.decision!.selection!.cards[0]!;
  await page.locator(`[data-card-handle="${resource}"]`).click();
  await page.getByRole('button', { name: 'Confirm resources', exact: true }).click();
  await ready();
  await page.getByText('Resources confirmed', { exact: true }).waitFor();
  await capture(
    '70a-resource-private-ready',
    'The early confirmation is private and can be changed until initiative resourcing resolves.',
  );
  const queuedState = state;
  await position(queuedState, 'p1');
  assert(!view.decision?.resourcePlan, 'Initiative player can see opponent readiness');
  await capture(
    '70b-initiative-resource-choice',
    'The initiative player sees their own choice, with no opponent-ready indicator.',
  );
  await position(galleryPlay(gameId, 'death-star-stormtrooper'));
  const anchor = view.events.at(-1)?.order ?? 0;
  send({
    type: 'chat',
    gameId,
    replace: true,
    messages: [
      {
        id: randomUUID(),
        sequence: 1,
        seat: 'p1',
        text: 'Let’s check this interaction together.',
        createdAt: new Date().toISOString(),
        afterEvent: Math.max(0, anchor - 1),
      },
      {
        id: randomUUID(),
        sequence: 2,
        seat: 'p2',
        text: 'Sounds good. I can see the card in the log.',
        createdAt: new Date().toISOString(),
        afterEvent: anchor,
      },
    ],
  });
  await page.getByText('Sounds good. I can see the card in the log.', { exact: true }).waitFor();
  await capture(
    '71-combined-activity',
    'Chat and game events share a single pane, with player-colored borders and distinct chat backgrounds.',
  );
  await detail(
    '.cf-log-rail',
    '71a-activity-detail',
    'Messages keep their place between game events after refresh.',
  );
  // Current instructions stay between the arenas, leaving every base clickable.
  const masterpiece = galleryBoard(gameId);
  masterpiece.players[0].space = [{ card: 'sabine-s-masterpiece--crazy-colorful', ref: 'x-wing' }];
  masterpiece.players[0].ground = [
    { card: 'battlefield-marine', ref: 'marine' },
    { card: 'consular-security-force' },
    { card: 'death-star-stormtrooper' },
  ];
  const colorful = scenario(masterpiece);
  await position(
    galleryStep(
      colorful.state,
      i =>
        i.kind === 'attack' &&
        i.attacker === colorful.refs['x-wing'] &&
        i.defender === colorful.refs['enemy-base'],
    ),
  );
  await page.getByText('Heal 2 damage from a base.', { exact: true }).waitFor();
  assert((await page.locator('.cf-choice-dialog').count()) === 0, 'Healing obscured the board');
  await capture(
    '72-masterpiece-heal',
    'Masterpiece shows only the current healing instruction between the arenas. Both bases remain clickable.',
  );
  const ownBase = view.cards.find(c => c.owner === 'p1' && c.face?.kind === 'base')!;
  await page.locator(`[data-card-handle="${ownBase.id}"]`).click();
  await ready();
  assert(
    state.cards[colorful.refs['own-base']!]!.damage === 5,
    'The base could not be healed through its card',
  );
  await page.getByText('Give an Experience token to a unit.', { exact: true }).waitFor();
  await capture(
    '72a-masterpiece-experience',
    'The next instruction explains exactly why a unit is being chosen: give an Experience token.',
  );
  const xpTarget = view.cards.find(c => c.face?.cardId === 'sabine-s-masterpiece--crazy-colorful')!;
  await page.locator(`[data-card-handle="${xpTarget.id}"]`).click();
  await ready();
  await page.getByText('Deal 1 damage to the chosen target.', { exact: true }).waitFor();
  await capture(
    '72b-masterpiece-damage',
    'The Aggression effect gets its own short damage instruction.',
  );
  await page.setViewportSize({ width: 430, height: 900 });
  await capture(
    '72c-masterpiece-mobile',
    'The compact targeting strip leaves cards accessible on a narrow screen.',
  );
  await page.setViewportSize({ width: 1600, height: 1000 });

  // Notes survive on the exact source; restrictions appear only on visible faces.
  const namedStates = [];
  for (const [card, file, caption] of [
    [
      'galen-erso--you-ll-never-win',
      '73-galen-named-card',
      'Galen carries a yellow named-card note. Affected units carry an orange ability-loss warning.',
    ],
    [
      'ryder-azadi--restored-governor',
      '74-ryder-play-restriction',
      'Ryder’s named title remains on his card; the affected player sees an orange play restriction on matching cards in hand.',
    ],
  ]) {
    const namingInput = galleryBoard(gameId);
    namingInput.players[0].hand = [{ card: card! }];
    namingInput.players[0].credits = [];
    namingInput.players[0].resources!.forEach(c => {
      c.exhausted = false;
    });
    namingInput.players[1].ground!.push({ card: 'battlefield-marine' });
    const naming = galleryStep(scenario(namingInput).state, 'play');
    await position(naming);
    assert(
      (await page.locator('.cf-illustrated-prompt > .cf-ability-art').count()) === 1,
      'A single effect has no source art',
    );
    if (card!.startsWith('galen'))
      await capture(
        '73a-single-effect-art',
        'Single-effect dialogs also show a smaller source image at the top right.',
      );
    const named = advance(naming, {
      ...choose(naming, 'accept-effect'),
      namedCardId: 'battlefield-marine',
    }).state;
    namedStates.push(named);
    await position(named, 'p2');
    const source = view.cards.find(c => c.face?.cardId === card)!;
    const note = page.locator(`[data-card-handle="${source.id}"] .cf-note-marker`);
    await note.hover();
    await page
      .getByRole('tooltip')
      .getByText('Named: Battlefield Marine', { exact: true })
      .waitFor();
    assert(
      (await page.locator('.cf-warning-marker').count()) > 0,
      'No warning on the affected card',
    );
    await capture(file!, caption!);
    await page.mouse.move(0, 0);
    if (card!.startsWith('galen')) {
      const affected = view.cards.find(
        c => c.owner === 'p2' && c.zone === 'ground' && c.face?.warnings?.length,
      )!;
      await page.locator(`[data-card-handle="${affected.id}"] .cf-warning-marker`).hover();
      await page
        .getByRole('tooltip')
        .getByText('This card has lost its abilities.', { exact: true })
        .waitFor();
      await capture(
        '73b-ability-loss-warning',
        'Orange warnings explain active ability loss directly on the affected unit.',
      );
      await page.mouse.move(0, 0);
    }
  }
  for (const namedCardId of ['mystic-monastery', 'shield']) {
    const input = galleryBoard(gameId);
    input.players[0].hand = [{ card: 'galen-erso--you-ll-never-win' }];
    input.players[0].credits = [];
    input.players[0].resources!.forEach(c => {
      c.exhausted = false;
    });
    input.players[1].base = { card: 'mystic-monastery' };
    input.attachments = [
      { card: 'shield', unit: 'consular', owner: 'p2' },
      { card: 'shield', unit: 'consular', owner: 'p2' },
      { card: 'shield', unit: 'trooper', owner: 'p2' },
    ];
    const naming = galleryStep(scenario(input).state, 'play');
    const named = advance(naming, { ...choose(naming, 'accept-effect'), namedCardId }).state;
    await position(named, 'p2');
    const marker =
      namedCardId === 'shield'
        ? page.locator('.cf-overlay-shield [data-token-handles] .cf-warning-marker')
        : page.locator('.cf-base-slot .cf-warning-marker');
    await marker.hover();
    await page
      .getByRole('tooltip')
      .getByText(
        namedCardId === 'shield'
          ? 'This Shield does not prevent damage.'
          : 'This card has lost its abilities.',
        { exact: true },
      )
      .waitFor();
    if (namedCardId === 'shield') {
      assert(
        (await page
          .locator('.cf-overlay-shield [data-card-handle][data-warning="true"]')
          .count()) === 1,
        'A single named Shield lost its warning',
      );
    } else {
      assert(
        !view.decision?.options.some(o => o.action?.id === 'gain-force'),
        'Named Force base still offers its action',
      );
    }
    await capture(
      namedCardId === 'shield' ? '73d-named-shields' : '73c-named-force-base',
      namedCardId === 'shield'
        ? 'Both grouped and individual Shields warn that their prevention ability is disabled.'
        : 'A named Force base carries an ability-loss warning and cannot use its Force action.',
    );
    await page.mouse.move(0, 0);
  }
  // Inspect the blocked hand copy on hover so its warning is readable in full.
  await position(namedStates[1]!, 'p2');
  const blocked = view.cards.find(
    c => c.zone === 'hand' && c.face?.cardId === 'battlefield-marine',
  )!;
  await page.locator(`[data-card-handle="${blocked.id}"]`).hover();
  await capture(
    '74a-blocked-hand',
    'The hand fan brings a restricted card forward with its orange warning.',
  );

  // One grouped decision: toggling a target never submits or opens an inspector.
  const maul = galleryBoard(gameId);
  maul.players[0].leader = { card: 'darth-maul--sith-revealed' };
  maul.players[0].resources = maul.players[0].resources!.slice(0, 4);
  const maulGame = scenario(maul);
  await position(maulGame.state);
  const arenaSizes = await page
    .locator('.cf-arena')
    .evaluateAll(arenas => arenas.map(a => a.getBoundingClientRect().height));
  const maulLeader = view.cards.find(c => c.owner === 'p1' && c.face?.kind === 'leader')!;
  await page.locator(`[data-card-handle="${maulLeader.id}"]`).click();
  await ready();
  assert(view.decision?.selection?.max === 2, 'Maul did not offer a grouped target choice');
  assert(
    JSON.stringify(
      await page
        .locator('.cf-arena')
        .evaluateAll(arenas => arenas.map(a => a.getBoundingClientRect().height)),
    ) === JSON.stringify(arenaSizes),
    'Targeting changed arena heights',
  );
  const descriptionBox = (await page
    .locator('.cf-board-target-prompt .cf-ability-description')
    .boundingBox())!;
  const statusBox = (await page
    .locator('.cf-board-target-prompt .cf-selection-status')
    .boundingBox())!;
  assert(
    Math.abs(descriptionBox.y - statusBox.y) < 3 && statusBox.x > descriptionBox.x,
    'Selection status is not beside the ability text',
  );
  assert(
    await page
      .locator('.cf-board-target-prompt > h2')
      .evaluate(h => getComputedStyle(h).borderBottomWidth === '0px'),
    'Action title still has a divider',
  );
  const stripBox = (await page.locator('.cf-action-band').boundingBox())!;
  const stripArtBox = (await page
    .locator('.cf-board-target-prompt .cf-ability-art')
    .boundingBox())!;
  assert(
    Math.abs(stripArtBox.x + stripArtBox.width - stripBox.x - stripBox.width) <= 2 &&
      Math.abs(stripArtBox.y - stripBox.y) <= 2,
    'Ability art is inset from the strip edge',
  );
  const targets = view.cards.filter(c => c.owner === 'p2' && c.zone === 'ground').slice(0, 2);
  const firstTarget = page.locator(`[data-card-handle="${targets[0]!.id}"]`);
  const secondTarget = page.locator(`[data-card-handle="${targets[1]!.id}"]`);
  const beforeTargets = sentCommands;
  await firstTarget.click();
  await firstTarget.locator('.cf-selected-amount').waitFor();
  await firstTarget.click();
  assert(
    (await firstTarget.locator('.cf-selected-amount').count()) === 0,
    'Clicking a selected target did not deselect',
  );
  await firstTarget.click();
  await secondTarget.click();
  assert(
    (await page.locator('.cf-selected-amount').count()) === 2,
    'Selected targets are not both indicated',
  );
  assert(sentCommands === beforeTargets, 'Selecting targets submitted before confirmation');
  assert((await page.getByRole('dialog').count()) === 0, 'Target toggling opened inspection');
  await capture(
    '75-maul-selected-targets',
    'Both Maul targets are highlighted with counts. Click either again to deselect before confirming.',
  );
  await page.setViewportSize({ width: 430, height: 900 });
  await capture(
    '75a-maul-targets-mobile',
    'The target selection and confirmation remain on the board on touch screens.',
  );
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.getByRole('button', { name: 'Use this effect', exact: true }).click();
  await ready();
  assert(sentCommands === beforeTargets + 1, 'Grouped targets were not submitted together');
  assert(state.cards[maulGame.refs.consular!]!.damage === 3, 'Confirmed damage was not applied');

  // Event artwork comes from below the text; leader art comes from the unit face.
  await position(galleryPlay(gameId, 'open-fire'));
  assert(
    (await page.locator('.cf-ability-art[data-art-region="event"]').count()) === 1,
    'Event prompt uses the wrong art region',
  );
  await capture(
    '76-event-target-art',
    'Event prompts use the lower artwork area, while unit and upgrade prompts use the upper artwork.',
  );
  await position(
    galleryStep(leader.state, i => i.kind === 'use-ability' && i.card === leader.refs.ahsoka),
  );
  const artUrl = await page
    .locator('.cf-illustrated-prompt .cf-ability-art img')
    .getAttribute('src');
  assert(artUrl?.includes('back'), 'Leader prompt did not use the unit face');
  await capture(
    '77-ahsoka-unit-art',
    'Ahsoka’s focused buff instruction is paired with art from her unit face.',
  );
  assert(errors.length === 0, errors.join('\n'));
  // Plot plays stay in their own direct Play/Skip panel.
  function plotPosition(card: string, count = 5) {
    const input = galleryBoard(gameId);
    input.players[0].leader = { card: 'sabine-wren--galvanized-revolutionary' };
    input.players[0].base = {
      card: card === 'naboo-royal-starship--fit-for-a-queen' ? 'command-center' : 'dagobah-swamp',
    };
    input.players[0].credits = [];
    input.players[0].resources = Array.from({ length: count }, (_, i) => ({
      card: i === count - 1 ? card : 'battlefield-marine',
      ...(i === count - 1 ? { ref: 'plot-card' } : {}),
    }));
    input.players[1].ground = [
      { card: 'battlefield-marine', ref: 'three' },
      { card: 'battlefield-marine', ref: 'four' },
    ];
    input.attachments = [{ card: 'experience', unit: 'four', owner: 'p2' }];
    return input;
  }
  function deployedPlot(input: ReturnType<typeof galleryBoard>) {
    const game = scenario(input);
    return {
      ...game,
      state: galleryStep(game.state, i => i.kind === 'use-ability' && i.abilityId === 'deploy'),
    };
  }
  function declaredPlot(game: ReturnType<typeof deployedPlot>, cards = [game.refs['plot-card']!]) {
    return advance(game.state, choose(game.state, 'accept-effect', cards)).state;
  }
  const plotShip = deployedPlot(plotPosition('naboo-royal-starship--fit-for-a-queen'));
  await position(plotShip.state);
  const plotResource = view.cards.find(
    c => c.face?.cardId === 'naboo-royal-starship--fit-for-a-queen',
  )!;
  await page.locator(`[data-card-handle="${plotResource.id}"]`).click();
  await page.getByRole('button', { name: 'Confirm Plot cards', exact: true }).click();
  await ready();
  const plotPrompt = page.locator('.cf-plot-prompt');
  await plotPrompt.getByRole('button', { name: 'Play', exact: true }).waitFor();
  await capture(
    '78-plot-play',
    'Plot shows the full card, a prominent Play button, Skip, and the optional payment switch.',
  );
  await plotPrompt.getByRole('button', { name: 'Play', exact: true }).click();
  await ready();
  assert(
    state.cards[plotShip.refs['plot-card']!]!.zone === 'space',
    'Plot Play did not play the card directly',
  );
  assert(
    state.players.p1!.resources.filter(id => !state.cards[id]!.exhausted).length === 1,
    'Default Plot payment did not prioritize its source',
  );

  for (const other of [false, true]) {
    const million = deployedPlot(plotPosition('one-in-a-million'));
    await position(declaredPlot(million));
    if (other) await plotPrompt.getByRole('switch', { name: 'Pay with other resources' }).click();
    await capture(
      other ? '79b-plot-other-resources' : '79-plot-self-payment',
      other
        ? 'The alternative pays with other resources, leaving One in a Million ready until replacement.'
        : 'Default Plot payment uses the Plot card itself when it is ready.',
    );
    await plotPrompt.getByRole('button', { name: 'Play', exact: true }).click();
    await ready();
    assert(
      state.players.p1!.resources.filter(id => !state.cards[id]!.exhausted).length ===
        (other ? 3 : 4),
      'Plot resource total is incorrect',
    );
    const legalTarget = view.decision!.options.find(o => o.kind === 'target')!;
    assert(view.decision!.options.length === 1, 'One in a Million offered an incorrect target');
    const targetStats = view.cards.find(c => c.id === legalTarget.cards[0])!.face!;
    assert(
      targetStats.power === (other ? 3 : 4) && targetStats.hp === (other ? 3 : 4),
      'One in a Million did not use resources remaining after replacement',
    );
    await capture(
      other ? '79c-plot-three-ready' : '79a-plot-four-ready',
      other
        ? 'Paying with another resource leaves three ready resources and the 3/3 target.'
        : 'Paying with One in a Million leaves four ready resources and the 4/4 target.',
    );
    await page.locator(`[data-card-handle="${legalTarget.cards[0]}"]`).click();
    await ready();
    assert(
      state.cards[million.refs[other ? 'three' : 'four']!]!.zone === 'discard',
      'The selected unit was not defeated',
    );
  }
  const plotArmor = deployedPlot(plotPosition('armor-of-fortune'));
  await position(declaredPlot(plotArmor));
  await plotPrompt.getByRole('switch', { name: 'Pay with other resources' }).click();
  const beforePlotHost = sentCommands;
  await plotPrompt.getByRole('button', { name: 'Play', exact: true }).click();
  assert(sentCommands === beforePlotHost, 'Plot upgrade played before selecting its host');
  assert(
    (await page.locator('.cf-choice-dialog').count()) === 0,
    'Plot upgrade targeting kept the dialog over the board',
  );
  const armorHost = view.cards.find(
    c => c.owner === 'p1' && c.zone === 'ground' && c.face?.cardId === 'battlefield-marine',
  )!;
  await page.locator(`[data-card-handle="${armorHost.id}"]`).click();
  await ready();
  assert(
    state.cards[plotArmor.refs['plot-card']!]!.attachedTo?.instanceId === plotArmor.refs.marine,
    'Plot upgrade lost the selected host',
  );
  assert(
    state.players.p1!.resources.filter(id => !state.cards[id]!.exhausted).length === 2,
    'Plot upgrade lost its alternative payment',
  );
  await capture(
    '80-plot-upgrade-target',
    'Plot upgrades use Play, then a direct click on the host, retaining the selected payment mode.',
  );

  const exactPlot = deployedPlot(plotPosition('naboo-royal-starship--fit-for-a-queen', 4));
  await position(exactPlot.state);
  await page.setViewportSize({ width: 430, height: 900 });
  await page.getByRole('button', { name: /^You resources ·/ }).click();
  const mobilePlotCard = view.cards.find(
    c => c.face?.cardId === 'naboo-royal-starship--fit-for-a-queen',
  )!;
  await page.locator(`.cf-pile-dialog [data-card-handle="${mobilePlotCard.id}"]`).click();
  await page.getByRole('button', { name: 'Back to board', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm Plot cards', exact: true }).click();
  await ready();
  assert(
    (await plotPrompt.getByRole('switch').count()) === 0,
    'Unavailable extra-resource payment was offered',
  );
  await capture(
    '80a-plot-mobile',
    'The full Plot card and Play/Skip controls fit on a narrow screen.',
  );
  await plotPrompt.getByRole('button', { name: 'Skip', exact: true }).click();
  await ready();
  assert(
    state.cards[exactPlot.refs['plot-card']!]!.zone === 'resources',
    'Skipping removed the Plot card',
  );
  await page.setViewportSize({ width: 1600, height: 1000 });

  // Acknowledging a public declaration is local to the opponent.
  const noticeInput = plotPosition('naboo-royal-starship--fit-for-a-queen');
  noticeInput.players[0].resources!.push({
    card: 'jar-jar-binks--mesa-propose-',
    ref: 'second-plot',
  });
  const noticePlot = deployedPlot(noticeInput);
  await position(noticePlot.state, 'p2');
  await page.reload();
  await page.locator('.cf-match').waitFor();
  await ready();
  if (await dismiss.count()) await dismiss.click();
  await position(
    declaredPlot(noticePlot, [noticePlot.refs['plot-card']!, noticePlot.refs['second-plot']!]),
    'p2',
  );
  const noticeDialog = page.getByRole('dialog', { name: 'Opponent’s Plot cards' });
  await noticeDialog.waitFor();
  assert(
    (await noticeDialog.locator('figure').count()) === 2,
    'Plot notice did not show both declared cards',
  );
  await capture(
    '81-opponent-plot-notice',
    'The opponent sees only the declared Plot cards in an image notice.',
  );
  const plotBatch = state.execution.frames[0];
  if (plotBatch?.kind !== 'trigger-batch') throw new Error('Expected Plot trigger order');
  const shipTrigger = plotBatch.triggers.find(
    t => t.source.instanceId === noticePlot.refs['plot-card'],
  )!;
  let continuePlot = galleryStep(
    state,
    i => i.kind === 'trigger' && i.triggerId === shipTrigger.id,
  );
  continuePlot = galleryStep(continuePlot, i => i.kind === 'play' && !i.plotPayment);
  await position(continuePlot, 'p2');
  assert(
    state.cards[noticePlot.refs['plot-card']!]!.zone === 'space',
    'The plotting player could not continue while the notice was open',
  );
  await noticeDialog.waitFor();
  await capture(
    '81a-plot-continues',
    'The plotting player has played the Starship while the opponent’s notice remains open.',
  );
  const beforeNoticeDismiss = sentCommands;
  await noticeDialog.getByRole('button', { name: 'Got it', exact: true }).click();
  assert(sentCommands === beforeNoticeDismiss, 'Dismissing the notice sent a game command');
  await page.getByRole('button', { name: 'Resync', exact: true }).click();
  await ready();
  assert((await noticeDialog.count()) === 0, 'Resync repeated the Plot notice');
  // Replacing the event suffix (as undo does) permits a fresh declaration notice.
  await position(noticePlot.state, 'p2');
  await position(
    declaredPlot(noticePlot, [noticePlot.refs['plot-card']!, noticePlot.refs['second-plot']!]),
    'p2',
  );
  await noticeDialog.waitFor();
  await noticeDialog.getByRole('button', { name: 'Got it', exact: true }).click();
  await page.reload();
  await page.locator('.cf-match').waitFor();
  await ready();
  assert((await noticeDialog.count()) === 0, 'Opening the game repeated a historical Plot notice');
  assert(errors.length === 0, errors.join('\n'));
  const related = [];
  for (const [file, label] of [
    ['history.html', 'History, chat and reports'],
    ['matches.html', 'Matches and sideboarding'],
  ])
    if (await Bun.file(`${folder}/${file}`).exists())
      related.push(`<a href="${file}">${label}</a>`);
  await Bun.write(
    `${folder}/index.html`,
    `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Crossfire board gallery</title><style>body{margin:0;background:#091421;color:#dfecf7;font:16px system-ui}main{max-width:1600px;margin:auto;padding:32px}h1{letter-spacing:.15em}p{color:#adc5d8}figure{margin:32px 0;padding:20px;background:#122236;border:1px solid #30495e;border-radius:12px}img{max-width:100%;max-height:850px;display:block;margin:auto}figcaption{padding-top:14px}a{color:#88dce7}</style><main><h1>CROSSFIRE</h1><p>Engine-generated development scenarios rendered by the actual game board. Click an image to open it at full size.</p><p><a href="#78-plot-play">Latest board improvements</a> · ${related.join(' · ')}</p>${entries.map(e => `<figure id="${e.file.replace(/\.png$/, '')}"><a href="${e.file}"><img src="${e.file}" loading="lazy" alt="${e.caption}"></a><figcaption>${e.caption}</figcaption></figure>`).join('')}</main></html>`,
  );
  await Bun.write(`${folder}/manifest.json`, JSON.stringify(entries, null, 2));
  // Serve only the generated gallery from Vite's ignored development directory.
  const served = 'frontend/.swubase/crossfire-gallery';
  await mkdir(served, { recursive: true });
  for (const file of ['index.html', 'manifest.json', ...entries.map(e => e.file)])
    await Bun.write(`${served}/${file}`, Bun.file(`${folder}/${file}`));
  console.log(
    `Gallery passed: ${entries.length} captures, local reorder, exact-name selection, stable arena sizing and ${sentCommands} engine command(s).`,
  );
} finally {
  await browser.close();
  const lobbies =
    await sql`SELECT id,game_id FROM play.lobbies WHERE creator_user_id = ANY(${users.map(u => u.id)})`;
  await sql`DELETE FROM play.lobbies WHERE id = ANY(${lobbies.map(l => l.id)})`;
  await sql`DELETE FROM play.games WHERE id = ANY(${lobbies.map(l => l.game_id).filter(Boolean)})`;
  await sql`DELETE FROM deck_card WHERE deck_id = ANY(${users.map(u => u.deck)})`;
  await sql`DELETE FROM deck_information WHERE deck_id = ANY(${users.map(u => u.deck)})`;
  await sql`DELETE FROM deck WHERE id = ANY(${users.map(u => u.deck)})`;
  await sql`DELETE FROM session WHERE user_id = ANY(${users.map(u => u.id)})`;
  await sql`DELETE FROM "user" WHERE id = ANY(${users.map(u => u.id)})`;
  await sql.end();
}
