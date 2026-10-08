// CARD_DETAIL_NAVIGATION_BROWSER_TEST=1 bun --env-file=.env --env-file=.env.worktree frontend/tests/card-detail-navigation.browser.ts
import { chromium, expect as baseExpect } from 'playwright/test';
import cards from '../../server/db/json/card-list.json';

const expect = baseExpect.configure({ timeout: 15_000 });
const origin = process.env.BETTER_AUTH_URL!;
if (
  process.env.CARD_DETAIL_NAVIGATION_BROWSER_TEST !== '1' ||
  (!['localhost', '127.0.0.1'].includes(new URL(origin).hostname) &&
    !new URL(origin).hostname.endsWith('.ts.net'))
)
  throw new Error('Enable this test only against a development worktree.');

const card = cards['storm-raider'];
const weekly = Object.values(card.variants).find(variant => variant.variantName === 'Weekly Play')!;
const foil = Object.values(card.variants).find(
  variant => variant.variantName === 'Weekly Play Foil',
)!;
const nextCard = cards['2-1b-surgical-droid'];
const hyperspace = Object.values(nextCard.variants).find(
  variant => variant.variantName === 'Hyperspace',
)!;
const standard = Object.values(nextCard.variants).find(
  variant => variant.variantName === 'Standard',
)!;
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
await context.addInitScript(() => localStorage.setItem('cookie-consent', 'true'));
const page = await context.newPage();
const errors: string[] = [];
page.on('pageerror', error => errors.push(error.message));

function variantLabel(variant: { variantName: string; set: string; cardNo: number }) {
  return `${variant.variantName} · ${variant.set.toUpperCase()} #${variant.cardNo}`;
}

async function expectSearch(values: Record<string, string | null>) {
  await expect
    .poll(() => {
      const search = new URL(page.url()).searchParams;
      return Object.fromEntries(Object.keys(values).map(key => [key, search.get(key)]));
    })
    .toEqual(values);
}

try {
  await page.goto(
    `${origin}/cards/detail/${card.cardId}?cardTab=variants&cardVariantId=${weekly.variantId}&deckFormat=1`,
  );
  const variantsTab = page.getByRole('tab', { name: /^Variants/ });
  const addSection = page.getByRole('region', { name: 'Add to list', exact: true });
  await expect(variantsTab).toHaveAttribute('aria-selected', 'true');
  await expect(addSection).toContainText(variantLabel(weekly));
  await expect(
    page.getByRole('button', { name: variantLabel(weekly), exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await expect(addSection).toContainText(variantLabel(weekly));
  await page.getByRole('button', { name: variantLabel(foil), exact: true }).click();
  await expectSearch({ cardTab: 'variants', cardVariantId: foil.variantId, deckFormat: '1' });
  await page.goBack();
  await expect(addSection).toContainText(variantLabel(weekly));
  await page.goForward();
  await expect(addSection).toContainText(variantLabel(foil));
  await page.getByRole('tab', { name: 'Card Details', exact: true }).click();
  await expectSearch({ cardTab: null, cardVariantId: foil.variantId, deckFormat: '1' });
  await page.goBack();
  await expect(variantsTab).toHaveAttribute('aria-selected', 'true');
  await expect(addSection).toContainText(variantLabel(foil));
  await page.getByRole('tab', { name: 'Card Details', exact: true }).click();
  await expectSearch({ cardTab: null, cardVariantId: foil.variantId, deckFormat: '1' });

  // Invalid tabs and foreign/missing variants fall back without losing the card page.
  await page.goto(
    `${origin}/cards/detail/${nextCard.cardId}?cardTab=invalid&cardVariantId=${weekly.variantId}`,
  );
  await expect(page.getByRole('tab', { name: 'Card Details', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await variantsTab.click();
  await expect(addSection).toContainText(variantLabel(standard));
  await page.goto(
    `${origin}/cards/detail/${nextCard.cardId}?cardTab=variants&cardVariantId=missing-variant`,
  );
  await expect(addSection).toContainText(variantLabel(standard));
  await page.goto(`${origin}/cards/detail/${nextCard.cardId}?cardTab=123&cardVariantId=[]`);
  await expect(page.getByRole('tab', { name: 'Card Details', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );

  // Modal parameters are independent of the card page behind the dialog.
  await page.goto(
    `${origin}/cards/detail/${card.cardId}?cardTab=variants&cardVariantId=${weekly.variantId}&deckFormat=1&formatId=1&metaId=1&modalCardId=${nextCard.cardId}&modalCardTab=variants&modalCardVariantId=${standard.variantId}&modalDecksForModalOpen=true&modalCardDecksId=${card.cardId}&modalCardDecksLeaderCardId=${card.cardId}&modalCardDecksBaseCardId=${card.cardId}&maDeckId=unrelated-deck`,
  );
  const dialog = page.getByRole('dialog');
  const modalAdd = dialog.getByRole('region', { name: 'Add to list', exact: true });
  await expect(modalAdd).toContainText(variantLabel(standard));
  await dialog.getByRole('button', { name: variantLabel(hyperspace), exact: true }).click();
  await expectSearch({
    modalCardVariantId: hyperspace.variantId,
    modalCardTab: 'variants',
    cardVariantId: weekly.variantId,
    cardTab: 'variants',
    deckFormat: '1',
  });
  await dialog.getByRole('tab', { name: 'Card Details', exact: true }).click();
  await expectSearch({
    modalCardTab: null,
    modalCardVariantId: hyperspace.variantId,
    cardTab: 'variants',
  });
  await page.goBack();
  await expect(modalAdd).toContainText(variantLabel(hyperspace));
  await page.reload();
  await expect(modalAdd).toContainText(variantLabel(hyperspace));
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expectSearch({
    modalCardId: null,
    modalCardTab: null,
    modalCardVariantId: null,
    cardTab: 'variants',
    cardVariantId: weekly.variantId,
    deckFormat: '1',
  });
  await expect(addSection).toContainText(variantLabel(weekly));
  await page.goBack();
  await expect(modalAdd).toContainText(variantLabel(hyperspace));
  await dialog.getByRole('link', { name: nextCard.name, exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(new URL(page.url()).pathname).toBe(`/cards/detail/${nextCard.cardId}`);
  await expectSearch({
    cardTab: 'variants',
    cardVariantId: hyperspace.variantId,
    modalCardId: null,
    modalCardTab: null,
    modalCardVariantId: null,
    deckFormat: '1',
    formatId: '1',
    metaId: '1',
    modalDecksForModalOpen: null,
    modalCardDecksId: null,
    modalCardDecksLeaderCardId: null,
    modalCardDecksBaseCardId: null,
    maDeckId: null,
  });
  await expect(addSection).toContainText(variantLabel(hyperspace));
  await page.reload();
  await expect(addSection).toContainText(variantLabel(hyperspace));

  // Dispatch the existing search-result action while a dialog is open to exercise an in-app card switch.
  await page.goto(
    `${origin}/cards/search?name=${encodeURIComponent(nextCard.name)}&resultsLayout=tableSmall&modalCardId=${card.cardId}&modalCardTab=variants&modalCardVariantId=${weekly.variantId}`,
  );
  await expect(dialog.getByRole('tab', { name: /^Variants/ })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  const resultRow = page.locator('table tbody tr').filter({ hasText: nextCard.name });
  await expect(resultRow).toHaveCount(1);
  await resultRow.evaluate(element => (element as HTMLElement).click());
  await expectSearch({
    modalCardId: nextCard.cardId,
    modalCardTab: null,
    modalCardVariantId: null,
    name: nextCard.name,
  });
  await expect(dialog.getByRole('tab', { name: 'Card Details', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(dialog.getByText('Standard', { exact: true })).toBeVisible();
  await dialog.getByRole('tab', { name: /^Variants/ }).click();
  await dialog.getByRole('button', { name: variantLabel(hyperspace), exact: true }).click();
  await page.reload();
  await expect(modalAdd).toContainText(variantLabel(hyperspace));
  await expectSearch({
    modalCardId: nextCard.cardId,
    modalCardTab: 'variants',
    modalCardVariantId: hyperspace.variantId,
    name: nextCard.name,
  });
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('button', { name: 'Reset All', exact: true }).click();
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expectSearch({ name: null, modalCardId: null });
  expect(errors).toEqual([]);
  console.log(
    'PASS: shareable tabs/variants, direct loads/reloads, history, malformed/foreign parameters, inherited filters, modal isolation/cleanup and modal-to-page links.',
  );
} finally {
  await context.close();
  await browser.close();
}
