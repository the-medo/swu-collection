// BATTLEFIELD_BROWSER_TEST=1 bun --env-file=.env --env-file=.env.worktree frontend/tests/user-currencies.browser.ts
import { withBattlefieldFixture, expect } from './battlefield/fixture.ts';

await withBattlefieldFixture('currencies-shop', async f => {
  const displayName = 'Currency Explorer';
  await f.sql`UPDATE "user" SET display_name=${displayName} WHERE id=${f.userId}`;
  await f.sql`INSERT INTO user_credits(user_id,currency,amount,source,source_key)
    VALUES (${f.userId},'beskar',875,'currency-browser',${crypto.randomUUID()})`;
  await f.page.goto(f.origin + '/users/' + f.userId + '?userTab=transactions');
  const balances = f.page.getByRole('region', { name: 'Your balances', exact: true });
  await expect(balances).toBeVisible();
  await expect(balances).toContainText('200,000');
  await expect(balances).toContainText('8.75');
  const transactions = f.page.getByRole('region', { name: 'Your transactions', exact: true });
  await expect(transactions).toContainText('+8.75 beskar');
  await expect(transactions).toContainText('Starting credits');
  const currencyPages = f.page.getByRole('tablist', { name: 'Currency pages', exact: true });
  await expect(f.page.getByRole('tab', { name: 'Beskar & Credits', exact: true })).toHaveAttribute(
    'data-state',
    'active',
  );
  await expect(
    currencyPages.getByRole('tab', { name: 'Transactions', exact: true }),
  ).toHaveAttribute('data-state', 'active');
  await expect(balances.getByRole('heading')).toHaveCount(0);
  await expect(balances.getByText('Only visible to you', { exact: true })).toHaveCount(0);
  await expect(balances.getByRole('link', { name: 'Shop for slots', exact: true })).toHaveCount(0);
  await expect(balances.locator('img')).toHaveCount(2);
  expect(
    await balances
      .locator('img')
      .evaluateAll(images =>
        images.every(
          image =>
            (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0,
        ),
      ),
  ).toBe(true);
  await balances.getByRole('link', { name: 'More info', exact: true }).click();
  const about = f.page.getByRole('region', { name: 'About beskar and credits', exact: true });
  await expect(about).toContainText('Saving a layout does not spend credits');
  await expect(about).toContainText('Every $1 USD of support earns 1,000 credits and 1 beskar.');
  await expect(
    currencyPages.getByRole('tab', { name: 'What is this', exact: true }),
  ).toHaveAttribute('data-state', 'active');
  expect(new URL(f.page.url()).searchParams.get('userTab')).toBe('currencies');
  expect(new URL(f.page.url()).searchParams.get('currencyPage')).toBeNull();
  await currencyPages.getByRole('tab', { name: 'Transactions', exact: true }).click();
  await expect(transactions).toBeVisible();
  await f.page.goBack();
  await expect(about).toBeVisible();
  await f.page.goForward();
  await expect(transactions).toBeVisible();
  await f.page.reload();
  await expect(transactions).toContainText('Starting credits');
  // More info should bring the newly opened section into view on narrow screens.
  await f.page.setViewportSize({ width: 390, height: 844 });
  await balances.getByRole('link', { name: 'More info', exact: true }).click();
  await expect(about.getByRole('heading', { name: 'Credits', exact: true })).toBeInViewport();
  await f.page.setViewportSize({ width: 1500, height: 1000 });
  // Neither anonymous nor another authenticated profile visitor gets private data or requests it.
  const privateRequests: string[] = [];
  f.anonPage.on('request', request => {
    if (
      /\/api\/user\/[^/]+\/(wallet|transactions)/.test(request.url()) ||
      /\/api\/shop(?:[?]|$)/.test(request.url())
    )
      privateRequests.push(request.url());
  });
  await f.anonPage.goto(f.origin + '/users/' + f.userId + '?userTab=transactions');
  await expect(f.anonPage.getByRole('heading', { name: displayName, exact: true })).toBeVisible();
  await expect(f.anonPage.getByRole('region', { name: 'Your balances', exact: true })).toHaveCount(
    0,
  );
  await expect(f.anonPage.getByRole('tab', { name: 'Transactions', exact: true })).toHaveCount(0);
  await expect(f.anonPage.getByRole('tab', { name: 'Beskar & Credits', exact: true })).toHaveCount(
    0,
  );
  expect(privateRequests).toEqual([]);
  expect(
    (await f.anonymous.request.get(f.origin + '/api/user/' + f.userId + '/wallet')).status(),
  ).toBe(401);
  await f.anonPage.goto(f.origin + '/shop');
  await expect(
    f.anonPage.getByText('You must be logged in to view this page.', { exact: true }),
  ).toBeVisible();
  const other = 'currency-other-' + crypto.randomUUID();
  const otherPrivateRequests: string[] = [];
  const onOtherPrivateRequest = (request: { url(): string }) => {
    if (
      /\/api\/user\/[^/]+\/(wallet|transactions)/.test(request.url()) ||
      /\/api\/shop(?:[?]|$)/.test(request.url())
    )
      otherPrivateRequests.push(request.url());
  };
  try {
    await f.sql`INSERT INTO "user"(id,name,display_name,email,email_verified,currency,role,created_at,updated_at)
      VALUES(${other},${other},${other},${other + '@invalid.local'},false,'USD','user',now(),now())`;
    expect(
      (await f.context.request.get(f.origin + '/api/user/' + other + '/wallet')).status(),
    ).toBe(403);
    expect(
      (await f.context.request.get(f.origin + '/api/user/' + other + '/transactions')).status(),
    ).toBe(403);
    f.page.on('request', onOtherPrivateRequest);
    await f.page.goto(f.origin + '/users/' + other + '?userTab=currencies&currencyPage=shop');
    await expect(f.page.getByRole('heading', { name: other, exact: true })).toBeVisible();
    await expect(f.page.getByRole('region', { name: 'Your balances', exact: true })).toHaveCount(0);
    await expect(f.page.getByRole('tab', { name: 'Transactions', exact: true })).toHaveCount(0);
    await expect(f.page.getByRole('tab', { name: 'Beskar & Credits', exact: true })).toHaveCount(0);
    expect(otherPrivateRequests).toEqual([]);
  } finally {
    f.page.off('request', onOtherPrivateRequest);
    await f.sql`DELETE FROM "user" WHERE id=${other}`;
  }
  await f.page.goto(f.origin + '/shop');
  await expect(f.page.getByText('8.75 beskar', { exact: true })).toBeVisible();
  expect(new URL(f.page.url()).searchParams.get('currencyPage')).toBe('shop');
  expect(new URL(f.page.url()).pathname).toBe('/users/' + f.userId);
  await currencyPages.getByRole('tab', { name: 'What is this', exact: true }).click();
  await expect(about).toBeVisible();
  await currencyPages.getByRole('tab', { name: 'Shop', exact: true }).click();
  await f.page.getByRole('button', { name: 'Buy achievement slot', exact: true }).click();
  const dialog = f.page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await f.page.goBack();
  await expect(about).toBeVisible();
  await expect(dialog).toBeHidden();
  await f.page.goForward();
  await expect(f.page.getByText('8.75 beskar', { exact: true })).toBeVisible();
  await expect(dialog).toBeHidden();
  const slotShop = f.page.getByRole('region', { name: 'Slot shop', exact: true });
  // A pending purchase must keep its status/error after browser navigation hides the dialog.
  let releaseRejection!: () => void;
  const heldRejection = new Promise<void>(resolve => {
    releaseRejection = resolve;
  });
  await f.page.route('**/api/shop/purchases', async route => {
    await heldRejection;
    await route.fulfill({
      status: 409,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Simulated rejected purchase.' }),
    });
  });
  try {
    await f.page.getByRole('button', { name: 'Buy achievement slot', exact: true }).click();
    await dialog.getByRole('button', { name: 'Buy for 5 beskar', exact: true }).click();
    await expect(dialog.getByRole('button', { name: 'Buying…', exact: true })).toBeDisabled();
    await f.page.goBack();
    await expect(about).toBeVisible();
    await expect(dialog).toBeHidden();
    await f.page.goForward();
    await expect(slotShop.getByRole('status')).toHaveText('Completing your purchase…');
    await expect(
      f.page.getByRole('button', { name: 'Buy achievement slot', exact: true }),
    ).toBeDisabled();
    releaseRejection();
    await expect(slotShop.getByRole('alert')).toHaveText('Simulated rejected purchase.');
    await expect(dialog).toBeHidden();
    await expect(f.page.getByText('8.75 beskar', { exact: true })).toBeVisible();
    await expect(
      f.page.getByRole('button', { name: 'Buy achievement slot', exact: true }),
    ).toBeEnabled();
  } finally {
    releaseRejection();
    await f.page.unroute('**/api/shop/purchases');
  }
  await f.page.getByRole('button', { name: 'Buy achievement slot', exact: true }).click();
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Buy for 5 beskar', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(f.page.getByText('3.75 beskar', { exact: true })).toBeVisible();
  const achievement = await f.context.request.get(
    f.origin + '/api/user/' + f.userId + '/achievements',
  );
  expect((await achievement.json()).data.achievementLimit).toBe(2);
  let loseResponse = true;
  let rejectRetry = true;
  let releaseLostResponse!: () => void;
  const heldLostResponse = new Promise<void>(resolve => {
    releaseLostResponse = resolve;
  });
  const requests: { itemId: string; requestId: string }[] = [];
  await f.page.route('**/api/shop/purchases', async route => {
    requests.push(route.request().postDataJSON());
    if (!loseResponse && rejectRetry) {
      rejectRetry = false;
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Simulated denied retry.' }),
      });
      return;
    }
    const response = await route.fetch();
    if (loseResponse) {
      loseResponse = false;
      expect(response.ok()).toBe(true);
      await heldLostResponse;
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Simulated lost purchase response.' }),
      });
    } else await route.fulfill({ response });
  });
  try {
    await f.page.getByRole('button', { name: 'Buy battlefield slot', exact: true }).click();
    await dialog.getByRole('button', { name: 'Buy for 3 beskar', exact: true }).click();
    await expect(dialog.getByRole('button', { name: 'Buying…', exact: true })).toBeDisabled();
    await f.page.goBack();
    await expect(about).toBeVisible();
    await expect(dialog).toBeHidden();
    await f.page.goForward();
    await expect(slotShop.getByRole('status')).toHaveText('Completing your purchase…');
    await expect(
      f.page.getByRole('button', { name: 'Buy battlefield slot', exact: true }),
    ).toBeDisabled();
    releaseLostResponse();
    await expect(slotShop.getByRole('alert')).toHaveText('Simulated lost purchase response.');
    await expect(dialog).toBeHidden();
  } finally {
    releaseLostResponse();
  }
  await expect(f.page.getByText('0.75 beskar', { exact: true })).toBeVisible();
  // Browsing another currency subpage must retain the unconfirmed purchase receipt.
  await currencyPages.getByRole('tab', { name: 'Transactions', exact: true }).click();
  await expect(transactions).toContainText('-3 beskar');
  await currencyPages.getByRole('tab', { name: 'What is this', exact: true }).click();
  await expect(about).toBeVisible();
  await currencyPages.getByRole('tab', { name: 'Shop', exact: true }).click();
  await expect(slotShop.getByRole('alert')).toHaveText('Simulated lost purchase response.');
  await f.page
    .getByRole('button', { name: 'Retry purchase of battlefield slot', exact: true })
    .click();
  await dialog.getByRole('button', { name: 'Retry purchase', exact: true }).click();
  await expect(dialog.getByRole('alert')).toHaveText('Simulated denied retry.');
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await f.page
    .getByRole('button', { name: 'Retry purchase of battlefield slot', exact: true })
    .click();
  await dialog.getByRole('button', { name: 'Retry purchase', exact: true }).click();
  await expect(dialog).toBeHidden();
  expect(requests).toHaveLength(3);
  expect(requests[0]).toEqual(requests[1]);
  expect(requests[0]).toEqual(requests[2]);
  await expect(
    f.page.getByRole('button', { name: 'Buy battlefield slot', exact: true }),
  ).toBeDisabled();
  await f.page.unroute('**/api/shop/purchases');
  await f.page.screenshot({ path: f.screenshots + 'shop-desktop.png', fullPage: true });
  expect((await f.editor()).limit).toBe(2);
  await f.createBattlefield();
  await f.createBattlefield();
  expect(
    (
      await f.context.request.post(f.origin + '/api/battlefields', {
        headers: f.headers,
        data: { name: 'Third unavailable slot' },
      })
    ).status(),
  ).toBe(409);
  const purchases =
    await f.sql`SELECT currency,amount,item_id FROM user_credits WHERE user_id=${f.userId} AND source='shop' ORDER BY item_id`;
  expect(
    purchases.map(row => ({
      currency: row.currency,
      amount: Number(row.amount),
      itemId: row.item_id,
    })),
  ).toEqual([
    { currency: 'beskar', amount: -500, itemId: 'achievement-slot' },
    { currency: 'beskar', amount: -300, itemId: 'battlefield-slot' },
  ]);
  await f.page.getByRole('link', { name: 'View transactions', exact: true }).click();
  await expect(transactions).toContainText('-5 beskar');
  await expect(transactions).toContainText('-3 beskar');
  await expect(balances).toContainText('0.75');
  await f.page.screenshot({ path: f.screenshots + 'profile-desktop.png', fullPage: true });
  await f.page.setViewportSize({ width: 390, height: 844 });
  await f.page.evaluate(() => localStorage.setItem('vite-ui-theme', 'dark'));
  await f.page.reload();
  await expect(transactions).toContainText('-5 beskar');
  await transactions.scrollIntoViewIfNeeded();
  expect(
    await f.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBe(true);
  await f.page.screenshot({ path: f.screenshots + 'profile-mobile-dark.png', fullPage: true });
  await f.page.goto(f.origin + '/shop');
  await expect(f.page.getByText('0.75 beskar', { exact: true })).toBeVisible();
  await f.page.getByRole('region', { name: 'Slot shop', exact: true }).scrollIntoViewIfNeeded();
  expect(
    await f.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBe(true);
  await f.page.screenshot({ path: f.screenshots + 'shop-mobile-dark.png', fullPage: true });
  await f.page.setViewportSize({ width: 1500, height: 1000 });
  await f.page.evaluate(() => localStorage.setItem('vite-ui-theme', 'light'));
  await f.page.reload();
  await expect(f.page.getByText('0.75 beskar', { exact: true })).toBeVisible();
  await f.page.screenshot({ path: f.screenshots + 'shop-desktop-light.png', fullPage: true });
  await f.page.route('**/api/shop', route =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Simulated shop failure.' }),
    }),
  );
  await f.page.reload();
  await expect(f.page.getByRole('alert')).toContainText('Simulated shop failure.');
  await f.page.unroute('**/api/shop');
  await f.page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(f.page.getByText('0.75 beskar', { exact: true })).toBeVisible();
  console.log(
    'PASS: compact SVG balances, Beskar & Credits subpages, private profile/history, legacy URLs, back/forward/refresh, both usable slot purchases, no overspending, idempotent retries across subpages, desktop/mobile, light/dark and shop error recovery.',
  );
});
