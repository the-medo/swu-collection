// CARD_DETAIL_PROMO_BROWSER_TEST=1 bun --env-file=.env --env-file=.env.worktree frontend/tests/card-detail-promos.browser.ts
import { chromium, expect as baseExpect } from 'playwright/test';
import postgres from 'postgres';
import { randomUUID } from 'node:crypto';
import { getCookies } from 'better-auth/cookies';
import { serializeSignedCookie } from 'better-call';
import cards from '../../server/db/json/card-list.json';
import { setInfo } from '../../lib/swu-resources/set-info.ts';
import type { SwuSet } from '../../types/enums.ts';
import type { CardVariant } from '../../lib/swu-resources/types.ts';

const expect = baseExpect.configure({ timeout: 15_000 });
const database = new URL(process.env.DATABASE_URL!);
const origin = process.env.BETTER_AUTH_URL!;
if (
  process.env.CARD_DETAIL_PROMO_BROWSER_TEST !== '1' ||
  database.hostname !== '127.0.0.1' ||
  !database.pathname.startsWith('/swubase_') ||
  (!['localhost', '127.0.0.1'].includes(new URL(origin).hostname) &&
    !new URL(origin).hostname.endsWith('.ts.net'))
)
  throw new Error('Enable this test only against an isolated development worktree.');

const sql = postgres(database.toString(), { max: 2 });
const userId = `card-promos-browser-${randomUUID()}`;
const collectionId = randomUUID();
const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();
const errors: string[] = [];
page.on('pageerror', error => errors.push(error.message));
await context.addInitScript(() => localStorage.setItem('cookie-consent', 'true'));

const promoCases: { cardId: string; variant: CardVariant }[] = [
  'Weekly Play',
  'Weekly Play Foil',
].map(name => ({
  cardId: cards['storm-raider'].cardId,
  variant: Object.values(cards['storm-raider'].variants).find(
    variant => variant.variantName === name,
  )! as CardVariant,
}));
for (const name of ['SQ Prize Wall', 'SQ Event Pack']) {
  const card = Object.values(cards).find(card =>
    Object.values(card.variants).some(
      variant => variant.variantName === name && !setInfo[variant.set as SwuSet],
    ),
  )!;
  promoCases.push({
    cardId: card.cardId,
    variant: Object.values(card.variants).find(
      variant => variant.variantName === name,
    )! as CardVariant,
  });
}

try {
  await sql`INSERT INTO "user" (id, name, display_name, email, email_verified, currency, created_at, updated_at)
    VALUES (${userId}, 'Promo variant fixture', 'Promo variant tester', ${userId + '@invalid.local'}, false, 'USD', now(), now())`;
  await sql`INSERT INTO collection (id, user_id, title, collection_type)
    VALUES (${collectionId}, ${userId}, 'Promo variant collection', 1)`;
  const token = randomUUID();
  await sql`INSERT INTO session (id, token, expires_at, user_id, created_at, updated_at)
    VALUES (${randomUUID()}, ${token}, now() + interval '1 hour', ${userId}, now(), now())`;
  const cookieName = getCookies({
    baseURL: origin,
    advanced: { cookiePrefix: process.env.BETTER_AUTH_COOKIE_PREFIX },
  }).sessionToken.name;
  const signed = (
    await serializeSignedCookie(cookieName, token, process.env.BETTER_AUTH_SECRET!)
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

  for (const { cardId, variant } of promoCases) {
    await page.goto(`${origin}/cards/detail/${cardId}`);
    await page.getByRole('tab', { name: /^Variants/ }).click();
    const section = page.getByRole('region', { name: 'Add to list', exact: true });
    await expect(section.getByLabel('Destination list')).toBeVisible();
    await page
      .getByRole('button', {
        name: `${variant.variantName} · ${variant.set.toUpperCase()} #${variant.cardNo}`,
        exact: true,
      })
      .click();
    await expect(section).toContainText(
      `${variant.variantName} · ${variant.set.toUpperCase()} #${variant.cardNo}`,
    );
    const foil = variant.variantName.toLowerCase().includes('foil');
    await expect(section.getByLabel('Foil', { exact: true })).toBeChecked({ checked: foil });
    await section.getByLabel('Destination list').click();
    await page.getByRole('option', { name: 'Promo variant collection', exact: true }).click();
    const added = page.waitForResponse(
      response =>
        response.request().method() === 'POST' &&
        new URL(response.url()).pathname === `/api/collection/${collectionId}/card`,
    );
    await section.getByRole('button', { name: 'Add', exact: true }).click();
    expect((await added).status()).toBe(201);
    const [stored] = await sql`SELECT card_id, variant_id, foil, amount FROM collection_card
      WHERE collection_id=${collectionId} AND card_id=${cardId} AND variant_id=${variant.variantId}`;
    expect(stored).toMatchObject({
      card_id: cardId,
      variant_id: variant.variantId,
      foil,
      amount: 1,
    });
    await page
      .getByRole('region', { name: 'Card in my lists', exact: true })
      .getByRole('button', { name: 'Check in my lists', exact: true })
      .click();
    await expect(
      page.getByRole('region', { name: 'Cards in Promo variant collection', exact: true }),
    ).toContainText(variant.variantName);
  }

  // Collection name entry must honor paired promo printings even with Always foil enabled.
  await page.goto(`${origin}/collections/${collectionId}`);
  await page.getByRole('tab', { name: 'Name', exact: true }).click();
  await page.getByRole('button', { name: 'Inserting defaults', exact: true }).click();
  await page.getByLabel('Always foil', { exact: true }).click();
  await expect(page.getByLabel('Always foil', { exact: true })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await page.getByRole('button', { name: 'Inserting defaults', exact: true }).click();
  for (const name of ['Weekly Play', 'Weekly Play Foil']) {
    const variant = Object.values(cards['storm-raider'].variants).find(
      variant => variant.variantName === name,
    )!;
    await page.getByPlaceholder('Card name...', { exact: true }).fill('Storm Raider');
    await page.getByRole('option').filter({ hasText: 'Storm Raider' }).click();
    await page
      .getByRole('option')
      .filter({ has: page.getByText(name, { exact: true }) })
      .click();
    const foil = name === 'Weekly Play Foil';
    await expect(page.getByLabel('Foil', { exact: true })).toBeChecked({ checked: foil });
    const added = page.waitForResponse(
      response =>
        response.request().method() === 'POST' &&
        new URL(response.url()).pathname === `/api/collection/${collectionId}/card`,
    );
    await page.getByRole('button', { name: 'Add to collection', exact: true }).click();
    expect((await added).status()).toBe(201);
    const rows = await sql`SELECT foil, amount FROM collection_card
      WHERE collection_id=${collectionId} AND variant_id=${variant.variantId}`;
    expect(rows).toEqual([{ foil, amount: 2 }]);
  }
  expect(errors).toEqual([]);
  console.log(
    'PASS: signed-in Weekly Play/foil and SQ selection, addition and lookup; collection name entry overrides Always foil for paired non-foil promos.',
  );
} finally {
  await context.close();
  await browser.close();
  await sql`DELETE FROM collection_card WHERE collection_id=${collectionId}`;
  await sql`DELETE FROM collection WHERE id=${collectionId}`;
  await sql`DELETE FROM "user" WHERE id=${userId}`;
  await sql.end();
}
