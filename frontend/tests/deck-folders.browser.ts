// DECK_FOLDERS_TEST=1 bun --env-file=.env --env-file=.env.worktree frontend/tests/deck-folders.browser.ts
import { chromium, expect as baseExpect, type BrowserContext, type Locator } from 'playwright/test';
import postgres from 'postgres';
import { mkdir } from 'node:fs/promises';
import { getCookies } from 'better-auth/cookies';
import { serializeSignedCookie } from 'better-call';

const expect = baseExpect.configure({ timeout: 20000 });
const database = new URL(process.env.DATABASE_URL!);
const origin = process.env.BETTER_AUTH_URL!;
if (
  process.env.DECK_FOLDERS_TEST !== '1' ||
  database.hostname !== '127.0.0.1' ||
  !database.pathname.startsWith('/swubase_')
) {
  throw new Error(
    'Explicitly enable deck folder browser tests against an isolated worktree database.',
  );
}
const sql = postgres(database.toString(), { max: 2 });
const userIds = [crypto.randomUUID(), crypto.randomUUID()];
const deckIds = Array.from({ length: 25 }, () => crypto.randomUUID());
const foreignDeckId = crypto.randomUUID();
const screenshots = new URL('../../.swubase/deck-folder-screenshots/', import.meta.url).pathname;
await mkdir(screenshots, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const errors: string[] = [];
const browserDiagnostics: string[] = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => {
  if (message.type() === 'error') browserDiagnostics.push(message.text());
});
page.on('requestfailed', request =>
  browserDiagnostics.push(
    `${request.method()} ${new URL(request.url()).pathname}: ${request.failure()?.errorText}`,
  ),
);

async function authenticate(target: BrowserContext, id: string) {
  const token = crypto.randomUUID();
  await sql`INSERT INTO session (id, token, expires_at, user_id, created_at, updated_at)
    VALUES (${crypto.randomUUID()}, ${token}, now() + interval '1 hour', ${id}, now(), now())`;
  const cookieName = getCookies({
    baseURL: origin,
    advanced: { cookiePrefix: process.env.BETTER_AUTH_COOKIE_PREFIX },
  }).sessionToken.name;
  const signed = (
    await serializeSignedCookie(cookieName, token, process.env.BETTER_AUTH_SECRET!)
  ).split(';')[0]!;
  await target.clearCookies();
  await target.addCookies([
    {
      name: cookieName,
      value: signed.slice(signed.indexOf('=') + 1),
      url: origin,
      httpOnly: true,
      secure: origin.startsWith('https:'),
      sameSite: 'Lax',
    },
  ]);
}
const folder = (name: string) => page.getByRole('row', { name: `Folder ${name}`, exact: true });
const folderDecks = (name: string) =>
  page.getByRole('region', { name: `Decks in ${name}`, exact: true });
const unfiled = () => page.getByRole('region', { name: 'Decks with no folder', exact: true });
const unfiledRow = () => page.getByRole('row', { name: 'No folder', exact: true });
async function dragFolder(
  name: string,
  target: Locator,
  placement: 'before' | 'after' | 'inside',
  indicator?: { target: Locator; placement: string },
  beforeRelease?: () => Promise<void>,
) {
  const topLevel = !(await target.count());
  if (!topLevel) await target.scrollIntoViewIfNeeded();
  await expect(
    folder(name).getByRole('button', { name: `Move ${name}`, exact: true }),
  ).toHaveAttribute('aria-disabled', 'false');
  const sourceBox = await folder(name)
    .getByRole('button', { name: `Move ${name}`, exact: true })
    .boundingBox();
  if (!sourceBox) throw new Error('Folder drag source is not visible');
  await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
  await page.mouse.down();
  // The top-level target appears only during an active drag.
  await page.mouse.move(sourceBox.x + sourceBox.width / 2 + 8, sourceBox.y + sourceBox.height / 2);
  await expect(page.locator('[data-folder-drop-root]')).toBeVisible();
  const targetBox = await target.boundingBox();
  if (!targetBox) throw new Error('Folder drag target is not visible');
  await page.mouse.move(
    targetBox.x + 100,
    targetBox.y +
      targetBox.height * (placement === 'before' ? 0.1 : placement === 'after' ? 0.9 : 0.5),
    { steps: 8 },
  );
  if (await target.getAttribute('data-folder-drop-row'))
    await expect(indicator?.target ?? target).toHaveAttribute(
      'data-drop-placement',
      indicator?.placement ?? placement,
    );
  await beforeRelease?.();
  await page.mouse.up();
}

try {
  for (const [index, id] of userIds.entries()) {
    await sql`INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at, display_name, currency)
      VALUES (${id}, ${`Folder fixture ${index}`}, ${id + '@invalid.local'}, false, now(), now(), ${`Folder fixture ${id}`}, 'USD')`;
  }
  for (const [index, id] of deckIds.entries()) {
    await sql`INSERT INTO deck (id, user_id, format, name, public, leader_card_id_1, base_card_id, updated_at)
      VALUES (${id}, ${userIds[0]}, 1, ${`Fixture deck ${index.toString().padStart(2, '0')}`}, 0,
        'sabine-wren--galvanized-revolutionary', 'command-center', ${new Date(Date.now() - index * 1000)})`;
    await sql`INSERT INTO deck_information (deck_id) VALUES (${id})`;
  }
  await sql`INSERT INTO deck (id,user_id,format,name,public) VALUES (${foreignDeckId},${userIds[1]},1,'Foreign private deck',0)`;
  await sql`INSERT INTO deck_information (deck_id) VALUES (${foreignDeckId})`;
  await authenticate(context, userIds[0]!);
  await context.addInitScript(() => {
    localStorage.setItem('cookie-consent', 'true');
    if (!localStorage.getItem('vite-ui-theme')) localStorage.setItem('vite-ui-theme', 'dark');
  });
  await page.goto(`${origin}/decks/your`);
  await expect(page.getByRole('heading', { name: 'Your decks', exact: true })).toBeVisible();
  await expect(
    page.getByRole('checkbox', { name: 'Select Fixture deck 00', exact: true }),
  ).toBeVisible();
  await expect(unfiled().getByRole('checkbox', { name: /^Select Fixture deck/ })).toHaveCount(20);
  await unfiled().getByRole('button', { name: 'Load more decks', exact: true }).click();
  await expect(unfiled().getByRole('checkbox', { name: /^Select Fixture deck/ })).toHaveCount(25);
  await expect(unfiledRow()).toBeVisible();
  await expect(
    unfiledRow().getByRole('button', { name: 'Move No folder', exact: true }),
  ).toHaveCount(0);
  await expect(unfiledRow()).not.toHaveAttribute('data-folder-drop-row', /.*/);
  await expect(unfiledRow().getByRole('button', { name: /^New subfolder/ })).toHaveCount(0);
  await expect(unfiledRow().getByRole('button', { name: /^Actions for/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Expand all folders', exact: true })).toHaveCount(
    0,
  );
  await unfiledRow()
    .getByRole('button', { name: 'Collapse decks with no folder', exact: true })
    .click();
  await expect(unfiled()).toHaveCount(0);
  await page.reload();
  await expect(
    unfiledRow().getByRole('button', { name: 'Expand decks with no folder', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Collapse all folders', exact: true }),
  ).toBeDisabled();
  await unfiledRow()
    .getByRole('button', { name: 'Expand decks with no folder', exact: true })
    .click();
  await expect(unfiled().getByRole('checkbox', { name: /^Select Fixture deck/ })).toHaveCount(20);
  await unfiled().getByRole('button', { name: 'Load more decks', exact: true }).click();
  await expect(unfiled().getByRole('checkbox', { name: /^Select Fixture deck/ })).toHaveCount(25);

  // A user folder named No folder is distinct from the built-in row and paginates independently.
  const paginatedFolderResponse = await page.request.post(`${origin}/api/deck-folders`, {
    data: { name: 'No folder' },
  });
  expect(paginatedFolderResponse.status()).toBe(201);
  const paginatedFolderId = (await paginatedFolderResponse.json()).data.id;
  expect(
    (
      await page.request.post(`${origin}/api/deck-folders/move`, {
        data: { deckIds, folderId: paginatedFolderId },
      })
    ).status(),
  ).toBe(200);
  await page.reload();
  await expect(unfiledRow()).toBeVisible();
  await expect(folder('No folder')).toBeVisible();
  await expect(folderDecks('No folder')).toHaveCount(0);
  await folder('No folder').getByRole('button', { name: 'Expand No folder', exact: true }).click();
  await expect(
    folderDecks('No folder').getByRole('checkbox', { name: /^Select Fixture deck/ }),
  ).toHaveCount(20);
  await folderDecks('No folder')
    .getByRole('button', { name: 'Load more decks', exact: true })
    .click();
  await expect(
    folderDecks('No folder').getByRole('checkbox', { name: /^Select Fixture deck/ }),
  ).toHaveCount(25);
  expect(
    (await page.request.delete(`${origin}/api/deck-folders/${paginatedFolderId}`)).status(),
  ).toBe(200);
  await page.reload();
  await expect(folder('No folder')).toHaveCount(0);
  await expect(unfiled().getByRole('checkbox', { name: /^Select Fixture deck/ })).toHaveCount(20);
  await unfiled().getByRole('button', { name: 'Load more decks', exact: true }).click();
  await expect(unfiled().getByRole('checkbox', { name: /^Select Fixture deck/ })).toHaveCount(25);

  await page.getByRole('button', { name: 'New folder', exact: true }).click();
  await page.getByRole('textbox', { name: 'Folder name', exact: true }).fill('Tournament prep');
  await page.getByRole('button', { name: 'Create folder', exact: true }).click();
  await expect(folder('Tournament prep')).toBeVisible();
  await folder('Tournament prep')
    .getByRole('button', { name: 'New subfolder in Tournament prep', exact: true })
    .click();
  await page.getByRole('textbox', { name: 'Folder name', exact: true }).fill('Aggro');
  await page.getByRole('button', { name: 'Create folder', exact: true }).click();
  await expect(folder('Aggro')).toBeVisible();
  await folder('Aggro')
    .getByRole('button', { name: 'New subfolder in Aggro', exact: true })
    .click();
  await page.getByRole('textbox', { name: 'Folder name', exact: true }).fill('Sabine');
  await page.getByRole('button', { name: 'Create folder', exact: true }).click();
  await expect(folder('Sabine')).toBeVisible();
  const folders = (await (await page.request.get(`${origin}/api/deck-folders`)).json()).data;
  const rootId = folders.find((item: { name: string }) => item.name === 'Tournament prep').id;
  const childId = folders.find((item: { name: string }) => item.name === 'Aggro').id;
  const leafId = folders.find((item: { name: string }) => item.name === 'Sabine').id;

  // Folder rows support sibling ordering and parent changes through actual pointer gestures.
  for (const name of ['Practice', 'Casual']) {
    await page.getByRole('button', { name: 'New folder', exact: true }).click();
    await page.getByRole('textbox', { name: 'Folder name', exact: true }).fill(name);
    await page.getByRole('button', { name: 'Create folder', exact: true }).click();
    await expect(folder(name)).toBeVisible();
  }
  const dragFolders = (await (await page.request.get(`${origin}/api/deck-folders`)).json()).data;
  const practiceId = dragFolders.find((item: { name: string }) => item.name === 'Practice').id;
  const casualId = dragFolders.find((item: { name: string }) => item.name === 'Casual').id;
  const rootOrder = async () =>
    (
      await sql`SELECT id FROM deck_folder WHERE user_id = ${userIds[0]} AND parent_id IS NULL ORDER BY position, name, id`
    ).map(row => row.id);
  const parentOf = async (id: string) =>
    (await sql`SELECT parent_id FROM deck_folder WHERE id = ${id}`)[0]?.parent_id;
  // A line below an expanded parent inserts before its first child, exactly where shown.
  await dragFolder('Practice', folder('Tournament prep'), 'after', {
    target: folder('Aggro'),
    placement: 'before',
  });
  await expect.poll(() => parentOf(practiceId)).toBe(rootId);
  await expect
    .poll(() =>
      page
        .locator('[data-folder-drop-row]')
        .evaluateAll(rows => rows.map(row => row.getAttribute('data-folder-drop-row'))),
    )
    .toEqual([rootId, practiceId, childId, leafId, casualId]);
  await expect(
    folder('Practice').getByRole('button', { name: 'Move Practice', exact: true }),
  ).toHaveAttribute('aria-disabled', 'false');
  await folder('Practice').getByRole('button', { name: 'Move Practice', exact: true }).focus();
  await page.keyboard.press('ArrowLeft');
  await expect.poll(rootOrder).toEqual([rootId, practiceId, casualId]);
  await folder('Tournament prep')
    .getByRole('button', { name: 'Collapse Tournament prep', exact: true })
    .click();
  await dragFolder('Casual', folder('Practice'), 'before');
  await expect.poll(rootOrder).toEqual([rootId, casualId, practiceId]);
  // A failed keyboard move preserves focus and the saved folder tree.
  let releaseMove!: () => void;
  const moveGate = new Promise<void>(resolve => {
    releaseMove = resolve;
  });
  let rejectedRequests = 0;
  await page.route('**/api/deck-folders/*/position', async route => {
    rejectedRequests++;
    await moveGate;
    await route.fulfill({
      status: 409,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Folder move conflict' }),
    });
  });
  const rejectedMove = page.waitForResponse(
    response => response.url().endsWith('/position') && response.status() === 409,
  );
  await expect(
    folder('Practice').getByRole('button', { name: 'Move Practice', exact: true }),
  ).toHaveAttribute('aria-disabled', 'false');
  await folder('Practice').getByRole('button', { name: 'Move Practice', exact: true }).focus();
  await page.keyboard.press('ArrowUp');
  await expect(
    folder('Practice').getByRole('button', { name: 'Move Practice', exact: true }),
  ).toHaveAttribute('aria-disabled', 'true');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Tab');
  await expect(
    folder('Practice').getByRole('button', { name: 'Move Practice', exact: true }),
  ).not.toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(
    folder('Practice').getByRole('button', { name: 'Move Practice', exact: true }),
  ).toBeFocused();
  expect(rejectedRequests).toBe(1);
  releaseMove();
  await rejectedMove;
  await expect(
    folder('Practice').getByRole('button', { name: 'Move Practice', exact: true }),
  ).toBeFocused();
  await expect(
    folder('Practice').getByRole('button', { name: 'Move Practice', exact: true }),
  ).toHaveAttribute('aria-disabled', 'false');
  expect(await rootOrder()).toEqual([rootId, casualId, practiceId]);
  await page.unroute('**/api/deck-folders/*/position');
  await page.reload();
  await expect(folder('Practice')).toBeVisible();
  expect(
    await page
      .locator('[data-folder-drop-row]')
      .evaluateAll(rows => rows.map(row => row.getAttribute('data-folder-drop-row'))),
  ).toEqual([rootId, casualId, practiceId]);
  await dragFolder('Casual', folder('Practice'), 'inside');
  await expect.poll(() => parentOf(casualId)).toBe(practiceId);
  await expect(folder('Casual')).toBeVisible();
  await dragFolder('Casual', folder('Tournament prep'), 'before');
  await expect.poll(rootOrder).toEqual([casualId, rootId, practiceId]);
  await folder('Casual').getByRole('button', { name: 'Collapse Casual', exact: true }).click();
  await folder('Casual').getByRole('button', { name: 'Move Casual', exact: true }).focus();
  await page.keyboard.press('ArrowDown');
  await expect.poll(rootOrder).toEqual([rootId, casualId, practiceId]);
  await expect(
    folder('Casual').getByRole('button', { name: 'Expand Casual', exact: true }),
  ).toBeVisible();
  // Query observer notifications can arrive after the first animation frame.
  const queryModuleUrl = await page.evaluate(() =>
    performance
      .getEntriesByType('resource')
      .map(entry => entry.name)
      .find(name => name.includes('@tanstack_react-query.js')),
  );
  if (!queryModuleUrl)
    throw new Error('Could not locate the running Query module for delayed-notification checks');
  await page.evaluate(async url => {
    const { notifyManager } = await import(url);
    notifyManager.setScheduler((callback: () => void) => setTimeout(callback, 120));
  }, queryModuleUrl);
  await folder('Practice').getByRole('button', { name: 'Move Practice', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => parentOf(practiceId)).toBe(casualId);
  await expect(
    folder('Practice').getByRole('button', { name: 'Move Practice', exact: true }),
  ).toBeFocused();
  await expect(
    folder('Practice').getByRole('button', { name: 'Move Practice', exact: true }),
  ).toHaveAttribute('aria-disabled', 'false');
  await page.keyboard.press('ArrowLeft');
  await expect.poll(() => parentOf(practiceId)).toBe(null);
  await expect.poll(rootOrder).toEqual([rootId, casualId, practiceId]);
  await expect(
    folder('Practice').getByRole('button', { name: 'Move Practice', exact: true }),
  ).toHaveAttribute('aria-disabled', 'false');
  await expect(
    folder('Practice').getByRole('button', { name: 'Move Practice', exact: true }),
  ).toBeFocused();
  await page.evaluate(async url => {
    const { notifyManager } = await import(url);
    notifyManager.setScheduler((callback: () => void) => setTimeout(callback, 0));
  }, queryModuleUrl);

  // Touch uses the same handle and drop targets, with normal page scrolling outside the handle.
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(folder('Practice')).toBeVisible();
  await expect(
    folder('Practice').getByRole('button', { name: 'Move Practice', exact: true }),
  ).toHaveAttribute('aria-disabled', 'false');
  await folder('Casual').scrollIntoViewIfNeeded();
  const touchSource = await folder('Casual')
    .getByRole('button', { name: 'Move Casual', exact: true })
    .boundingBox();
  const touchTarget = await folder('Practice').boundingBox();
  if (!touchSource || !touchTarget) throw new Error('Touch drag endpoints are not visible');
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true });
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [
      { x: touchSource.x + touchSource.width / 2, y: touchSource.y + touchSource.height / 2 },
    ],
  });
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x: touchTarget.x + 100, y: touchTarget.y + touchTarget.height / 2 }],
  });
  await expect(folder('Practice')).toHaveAttribute('data-drop-placement', 'inside');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect.poll(() => parentOf(casualId)).toBe(practiceId);
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: false });
  await cdp.detach();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(folder('Casual')).toBeVisible();
  await dragFolder('Casual', page.locator('[data-folder-drop-root]'), 'inside');
  await expect.poll(() => parentOf(casualId)).toBe(null);
  await expect.poll(rootOrder).toEqual([rootId, practiceId, casualId]);

  // Dragging scrolls the main pane to reach a folder that starts outside the viewport.
  const scrollNames = Array.from({ length: 10 }, (_, index) => `Scroll ${index + 1}`);
  for (const name of scrollNames) {
    await page.getByRole('button', { name: 'New folder', exact: true }).click();
    await page.getByRole('textbox', { name: 'Folder name', exact: true }).fill(name);
    await page.getByRole('button', { name: 'Create folder', exact: true }).click();
    await expect(folder(name)).toBeVisible();
  }
  const scrollFolders = (
    await (await page.request.get(`${origin}/api/deck-folders`)).json()
  ).data.filter((item: { name: string }) => scrollNames.includes(item.name));
  const scrollTargetId = scrollFolders.find(
    (item: { name: string }) => item.name === 'Scroll 10',
  ).id;
  await page.getByRole('button', { name: 'Collapse all folders', exact: true }).click();
  // Keep enough deck rows below the folders to exercise both scroll edges.
  await unfiledRow()
    .getByRole('button', { name: 'Expand decks with no folder', exact: true })
    .click();
  await page.setViewportSize({ width: 1440, height: 500 });
  const beforeClicks = await rootOrder();
  let dragRequests = 0;
  const countDragRequest = (request: { url: () => string }) => {
    if (request.url().endsWith('/position')) dragRequests++;
  };
  page.on('request', countDragRequest);
  // Holding a handle near either scroll edge without moving is a click, not a drag.
  for (const [name, y] of [
    ['Scroll 10', 480],
    ['Scroll 5', 20],
  ] as const) {
    const handle = folder(name).getByRole('button', { name: `Move ${name}`, exact: true });
    await handle.scrollIntoViewIfNeeded();
    await handle.evaluate((element, targetY) => {
      const bounds = element.getBoundingClientRect();
      element.closest('main')!.scrollTop += bounds.y + bounds.height / 2 - targetY;
    }, y);
    const bounds = (await handle.boundingBox())!;
    const before = await page.locator('main').evaluate(main => main.scrollTop);
    await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(160);
    await expect(page.getByText('Drop here to move to the top level', { exact: true })).toHaveCount(
      0,
    );
    expect(await page.locator('main').evaluate(main => main.scrollTop)).toBe(before);
    await page.mouse.up();
  }
  expect(await rootOrder()).toEqual(beforeClicks);
  expect(dragRequests).toBe(0);
  // Escape cancels an active drag; Arrow keys do not submit another move during it.
  const cancelBounds = (await folder('Scroll 5')
    .getByRole('button', { name: 'Move Scroll 5', exact: true })
    .boundingBox())!;
  await page.mouse.move(
    cancelBounds.x + cancelBounds.width / 2,
    cancelBounds.y + cancelBounds.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(cancelBounds.x + 120, 200, { steps: 5 });
  await expect(page.getByText('Drop here to move to the top level', { exact: true })).toBeVisible();
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await expect(page.getByText('Drop here to move to the top level', { exact: true })).toHaveCount(
    0,
  );
  expect(await rootOrder()).toEqual(beforeClicks);
  expect(dragRequests).toBe(0);
  page.off('request', countDragRequest);
  await folder('Casual').scrollIntoViewIfNeeded();
  const scrollSource = await folder('Casual')
    .getByRole('button', { name: 'Move Casual', exact: true })
    .boundingBox();
  if (!scrollSource) throw new Error('Scroll drag source is not visible');
  expect((await folder('Scroll 10').boundingBox())!.y).toBeGreaterThan(500);
  const scrollBefore = await page.locator('main').evaluate(main => main.scrollTop);
  await page.mouse.move(
    scrollSource.x + scrollSource.width / 2,
    scrollSource.y + scrollSource.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(scrollSource.x + 100, 485, { steps: 6 });
  await expect.poll(async () => (await folder('Scroll 10').boundingBox())!.y).toBeLessThan(400);
  expect(await page.locator('main').evaluate(main => main.scrollTop)).toBeGreaterThan(scrollBefore);
  expect((await page.locator('[data-folder-drop-root]').boundingBox())!.y).toBeLessThan(40);
  await page.mouse.move(scrollSource.x + 100, 200);
  // Stop edge scrolling before measuring the drop row; slow frames can overshoot it.
  await folder('Scroll 10').evaluate(element =>
    element.scrollIntoView({ block: 'center', behavior: 'instant' }),
  );
  const scrollTarget = (await folder('Scroll 10').boundingBox())!;
  expect(scrollTarget.y).toBeGreaterThan(120);
  expect(scrollTarget.y + scrollTarget.height).toBeLessThan(page.viewportSize()!.height - 64);
  await page.mouse.move(scrollTarget.x + 100, scrollTarget.y + 3, { steps: 4 });
  await expect(folder('Scroll 10')).toHaveAttribute('data-drop-placement', 'before');
  await page.mouse.up();
  await expect
    .poll(async () => {
      const order = await rootOrder();
      return order.indexOf(scrollTargetId) - order.indexOf(casualId);
    })
    .toBe(1);
  await expect(
    folder('Casual').getByRole('button', { name: 'Move Casual', exact: true }),
  ).toHaveAttribute('aria-disabled', 'false');
  // The same edge scrolling also reaches rows above the current viewport.
  await folder('Casual').scrollIntoViewIfNeeded();
  expect((await folder('Practice').boundingBox())!.y).toBeLessThan(0);
  const upSource = (await folder('Casual')
    .getByRole('button', { name: 'Move Casual', exact: true })
    .boundingBox())!;
  await page.mouse.move(upSource.x + upSource.width / 2, upSource.y + upSource.height / 2);
  await page.mouse.down();
  await page.mouse.move(upSource.x + 100, 10, { steps: 6 });
  await expect.poll(async () => (await folder('Practice').boundingBox())!.y).toBeGreaterThan(160);
  await page.mouse.move(upSource.x + 100, 200);
  const upTarget = (await folder('Practice').boundingBox())!;
  await page.mouse.move(upTarget.x + 100, upTarget.y + 3, { steps: 4 });
  await expect(folder('Practice')).toHaveAttribute('data-drop-placement', 'before');
  await page.mouse.up();
  await expect
    .poll(async () => (await rootOrder()).slice(0, 3))
    .toEqual([rootId, casualId, practiceId]);
  await expect(
    folder('Casual').getByRole('button', { name: 'Move Casual', exact: true }),
  ).toHaveAttribute('aria-disabled', 'false');
  for (const item of scrollFolders)
    expect((await page.request.delete(`${origin}/api/deck-folders/${item.id}`)).status()).toBe(200);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.reload();
  await expect(folder('Casual')).toBeVisible();
  // No folder is always last and does not accept any folder drop or contain folder controls.
  expect(
    await page
      .locator('table[aria-label="Deck folders"] > tbody > tr[aria-label]')
      .last()
      .getAttribute('aria-label'),
  ).toBe('No folder');
  const beforeUnfiledDrop = await rootOrder();
  let unfiledDropRequests = 0;
  const countUnfiledDrop = (request: { url: () => string }) => {
    if (request.url().endsWith('/position')) unfiledDropRequests++;
  };
  page.on('request', countUnfiledDrop);
  await dragFolder('Casual', unfiledRow(), 'inside', undefined, async () => {
    await expect(page.locator('[data-drop-placement]')).toHaveCount(0);
    await expect(page.locator('[data-folder-drop-root]')).not.toHaveClass(/\boutline-2\b/);
    await expect(
      page.locator('[aria-live="polite"]').filter({ hasText: /^Drag Casual between rows/ }),
    ).toHaveCount(1);
  });
  await expect(
    folder('Casual').getByRole('button', { name: 'Move Casual', exact: true }),
  ).toHaveAttribute('aria-disabled', 'false');
  expect(unfiledDropRequests).toBe(0);
  expect(await rootOrder()).toEqual(beforeUnfiledDrop);
  page.off('request', countUnfiledDrop);

  // Remove these empty drag fixtures through the UI, leaving the nested deck fixture intact.
  for (const name of ['Casual', 'Practice']) {
    await folder(name)
      .getByRole('button', { name: `Actions for ${name}`, exact: true })
      .click();
    await page.getByRole('menuitem', { name: 'Remove folder', exact: true }).click();
    await page.getByRole('button', { name: 'Remove folder', exact: true }).click();
    await expect(folder(name)).toHaveCount(0);
    await page.keyboard.press('Escape');
  }

  // Reopening the page does not lose either page of the table's existing cache.
  const expandUnfiled = unfiledRow().getByRole('button', {
    name: 'Expand decks with no folder',
    exact: true,
  });
  if (await expandUnfiled.count()) await expandUnfiled.click();
  const last = page.getByRole('checkbox', { name: 'Select Fixture deck 24', exact: true });
  if (!(await last.count()))
    await unfiled().getByRole('button', { name: 'Load more decks', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Select Fixture deck 00', exact: true }).check();
  await last.check();
  await expect(page.getByText('2 decks selected', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Move to folder', exact: true }).click();
  await page
    .getByRole('combobox', { name: 'Destination folder', exact: true })
    .selectOption({ label: 'Tournament prep / Aggro / Sabine' });
  await page.getByRole('button', { name: 'Move decks', exact: true }).click();
  await expect(
    folderDecks('Sabine').getByRole('checkbox', { name: /^Select Fixture deck/ }),
  ).toHaveCount(2);
  await expect(
    unfiled().getByRole('checkbox', { name: 'Select Fixture deck 00', exact: true }),
  ).toHaveCount(0);
  await expect(page.getByText('2 decks selected', { exact: true })).toHaveCount(0);
  expect(
    (await sql`SELECT count(*)::int AS count FROM deck_folder_deck WHERE folder_id = ${leafId}`)[0]!
      .count,
  ).toBe(2);

  // Selection spans folders, but changing filters clears decks that are no longer visible.
  await folderDecks('Sabine')
    .getByRole('checkbox', { name: 'Select Fixture deck 00', exact: true })
    .check();
  await unfiled().getByRole('checkbox', { name: 'Select Fixture deck 02', exact: true }).check();
  await expect(page.getByText('2 decks selected', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Filters', exact: true }).click();
  await page.getByRole('button', { name: 'All Formats', exact: true }).click();
  await page.getByRole('menuitemradio', { name: 'Eternal', exact: true }).click();
  await expect(page.getByText('2 decks selected', { exact: true })).toHaveCount(0);
  await expect(
    folderDecks('Sabine').getByRole('checkbox', { name: /^Select Fixture deck/ }),
  ).toHaveCount(0);

  // Restored open folders issue their first request with the URL filters already applied.
  const filteredRequests: string[] = [];
  const recordRequest = (request: { url: () => string }) => {
    const url = new URL(request.url());
    if (url.pathname === '/api/deck' && url.searchParams.has('folderId'))
      filteredRequests.push(url.searchParams.get('format') ?? '');
  };
  page.on('request', recordRequest);
  await page.goto(`${origin}/decks/your?deckFormat=6`);
  await expect(
    folderDecks('Sabine').getByText('No decks here match the current filters.'),
  ).toBeVisible();
  expect(filteredRequests.length).toBeGreaterThan(0);
  expect(filteredRequests.every(format => format === '6')).toBe(true);
  page.off('request', recordRequest);
  const resetFilters = page.getByRole('button', { name: 'Reset Filters (1)', exact: true });
  if (!(await resetFilters.isVisible()))
    await page.getByRole('button', { name: /Filters.*1 active/ }).click();
  await resetFilters.click();
  await expect(
    folderDecks('Sabine').getByRole('checkbox', { name: /^Select Fixture deck/ }),
  ).toHaveCount(2);
  await expect(page.getByText('2 decks selected', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Filters', exact: true }).click();
  await page.getByRole('heading', { name: 'Your decks', exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${screenshots}/nested-folders-dark.png` });

  await folder('Sabine').getByRole('button', { name: 'Collapse Sabine', exact: true }).click();
  await page.reload();
  await expect(
    folder('Tournament prep').getByRole('button', {
      name: 'Collapse Tournament prep',
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    folder('Aggro').getByRole('button', { name: 'Collapse Aggro', exact: true }),
  ).toBeVisible();
  await expect(
    folder('Sabine').getByRole('button', { name: 'Expand Sabine', exact: true }),
  ).toBeVisible();
  const stored = await page.evaluate(
    id => JSON.parse(localStorage.getItem(`swubase:deck-folders:opened:v1:${id}`) ?? '[]'),
    userIds[0]!,
  );
  expect(stored).toContain(rootId);
  expect(stored).toContain(childId);
  expect(stored).not.toContain(leafId);
  await folder('Sabine').getByRole('button', { name: 'Expand Sabine', exact: true }).click();
  await folder('Sabine').getByRole('button', { name: 'Actions for Sabine', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Edit folder', exact: true }).click();
  await page.getByRole('textbox', { name: 'Folder name', exact: true }).fill('Sabine tests');
  const renameRequest = page.waitForRequest(
    request => request.url().endsWith(`/deck-folders/${leafId}`) && request.method() === 'PUT',
  );
  await page.getByRole('button', { name: 'Save folder', exact: true }).click();
  expect((await renameRequest).postDataJSON()).not.toHaveProperty('parentId');
  await expect(folder('Sabine tests')).toBeVisible();
  await page.keyboard.press('Escape');
  expect(
    (
      await page.request.put(`${origin}/api/deck-folders/${rootId}`, {
        data: { name: 'Tournament prep', parentId: leafId },
      })
    ).status(),
  ).toBe(409);
  expect(
    (
      await page.request.post(`${origin}/api/deck-folders/move`, {
        data: { deckIds: [deckIds[0], foreignDeckId], folderId: leafId },
      })
    ).status(),
  ).toBe(404);
  expect(
    (await sql`SELECT count(*)::int AS count FROM deck_folder_deck WHERE folder_id = ${leafId}`)[0]!
      .count,
  ).toBe(2);

  // Both ownership and persisted expansion are isolated when changing accounts in one browser.
  await authenticate(context, userIds[1]!);
  await page.reload();
  await expect(
    page.getByRole('checkbox', { name: 'Select Foreign private deck', exact: true }),
  ).toBeVisible();
  await expect(folder('Tournament prep')).toHaveCount(0);
  expect((await page.request.delete(`${origin}/api/deck-folders/${rootId}`)).status()).toBe(404);
  await authenticate(context, userIds[0]!);
  await page.reload();
  await expect(
    folder('Sabine tests').getByRole('button', { name: 'Collapse Sabine tests', exact: true }),
  ).toBeVisible();

  // Existing bulk deletion remains available alongside Move to folder.
  await unfiled().getByRole('checkbox', { name: 'Select Fixture deck 01', exact: true }).check();
  await page.getByRole('button', { name: 'Delete selected', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Please type "DELETE" to confirm deletion', exact: true })
    .fill('DELETE');
  await page.getByRole('button', { name: 'Delete 1 deck', exact: true }).click();
  await expect(
    page.getByRole('checkbox', { name: 'Select Fixture deck 01', exact: true }),
  ).toHaveCount(0);

  await page.evaluate(() => localStorage.setItem('vite-ui-theme', 'light'));
  await page.reload();
  await expect(folder('Sabine tests')).toBeVisible();
  await page.getByRole('heading', { name: 'Your decks', exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${screenshots}/nested-folders-light.png` });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(folder('Sabine tests')).toBeVisible();
  await page.getByRole('heading', { name: 'Your decks', exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${screenshots}/nested-folders-mobile.png` });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Collapse all folders', exact: true }).click();
  await page.reload();
  await expect(
    folder('Tournament prep').getByRole('button', { name: 'Expand Tournament prep', exact: true }),
  ).toBeVisible();
  await expect(
    unfiledRow().getByRole('button', { name: 'Expand decks with no folder', exact: true }),
  ).toBeVisible();
  await expect(unfiled()).toHaveCount(0);
  await folder('Tournament prep')
    .getByRole('button', { name: 'Expand Tournament prep', exact: true })
    .click();
  await folder('Aggro').getByRole('button', { name: 'Expand Aggro', exact: true }).click();
  await folder('Sabine tests')
    .getByRole('button', { name: 'Expand Sabine tests', exact: true })
    .click();
  await unfiledRow()
    .getByRole('button', { name: 'Expand decks with no folder', exact: true })
    .click();

  const failedFolderLoads: string[] = [];
  page.on('response', response => {
    const url = new URL(response.url());
    if (url.pathname === '/api/deck' && response.status() >= 400)
      failedFolderLoads.push(response.url());
  });
  await folder('Tournament prep')
    .getByRole('button', { name: 'Actions for Tournament prep', exact: true })
    .click();
  await page.getByRole('menuitem', { name: 'Remove folder', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('All decks are kept');
  await page.getByRole('button', { name: 'Remove folder', exact: true }).click();
  await expect(folder('Tournament prep')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(
    unfiled().getByRole('checkbox', { name: 'Select Fixture deck 00', exact: true }),
  ).toBeVisible();
  expect(failedFolderLoads).toEqual([]);
  expect(
    (await sql`SELECT count(*)::int AS count FROM deck WHERE user_id = ${userIds[0]}`)[0]!.count,
  ).toBe(24);
  expect(
    (await sql`SELECT count(*)::int AS count FROM deck_folder WHERE user_id = ${userIds[0]}`)[0]!
      .count,
  ).toBe(0);
  const anonymous = await browser.newContext();
  expect((await anonymous.request.get(`${origin}/api/deck-folders`)).status()).toBe(401);
  await anonymous.close();
  expect(errors).toEqual([]);
  console.log(
    'Folder rows, mouse/touch dragging, persisted ordering, keyboard reparenting, nested folders, pagination, bulk move/delete, ownership, cycle rejection, per-account reload persistence, removal, and responsive themes passed.',
  );
} catch (error) {
  await page.screenshot({ path: `${screenshots}/failure.png`, fullPage: true });
  console.error('Browser errors:', errors);
  console.error('Browser diagnostics:', browserDiagnostics, 'Page:', page.url());
  throw error;
} finally {
  await browser.close();
  await sql`DELETE FROM deck_folder WHERE user_id IN ${sql(userIds)}`;
  await sql`DELETE FROM deck_information WHERE deck_id IN ${sql([...deckIds, foreignDeckId])}`;
  await sql`DELETE FROM deck WHERE id IN ${sql([...deckIds, foreignDeckId])}`;
  await sql`DELETE FROM session WHERE user_id IN ${sql(userIds)}`;
  await sql`DELETE FROM "user" WHERE id IN ${sql(userIds)}`;
  await sql.end();
}
