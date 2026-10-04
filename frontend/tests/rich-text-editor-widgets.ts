import { expect as baseExpect, type Page } from 'playwright/test';
const expect = baseExpect.configure({ timeout: 20_000 });

export async function exerciseWidgets(
  page: Page,
  options: {
    userId: string;
    tournamentId: string;
    groupId: string;
    slash: (command: string) => Promise<void>;
    endOfDocument: () => Promise<void>;
  },
) {
  const { userId, tournamentId, groupId, slash, endOfDocument } = options;
  const surface = page.locator('.rte-surface');
  const dialog = page.getByRole('dialog');

  await endOfDocument();
  await page.keyboard.type('email@example.test');
  await expect(dialog).toBeHidden();
  await page.keyboard.press('Enter');
  await page.keyboard.insertText('@');
  await expect(dialog.getByRole('heading', { name: 'Mention a user' })).toBeVisible();
  const search = dialog.getByRole('combobox', { name: 'Search users' });
  await search.fill('Editor fixture');
  await expect(dialog.getByRole('option', { name: '@Editor fixture', exact: true })).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(dialog).toBeHidden();
  await expect(surface.locator('.rte-mention')).toHaveAttribute('href', `/users/${userId}`);
  await endOfDocument();
  await page.keyboard.press('@');
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await page.keyboard.type('literal');
  await expect(surface).toContainText('@literal');
  await page.keyboard.type(' wrote this guide');
  await expect(surface).toContainText('wrote this guide');

  await slash('callout');
  await dialog.getByLabel('Title', { exact: true }).fill('Mulligan plan');
  await dialog
    .getByLabel('Notes', { exact: true })
    .fill('Keep early units and a clear turn-two play.');
  await dialog.getByRole('button', { name: 'Insert widget', exact: true }).click();
  await expect(dialog).toBeHidden();
  const callout = surface.locator('[data-widget-kind=callout]');
  await expect(callout).toContainText('Mulligan plan');
  await callout.getByRole('button', { name: 'Edit callout' }).click();
  await dialog.getByLabel('Notes', { exact: true }).fill('Updated strategy: keep early units.');
  await dialog.getByRole('button', { name: 'Save widget', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(callout).toContainText('Updated strategy: keep early units.');

  await slash('card-group');
  for (const name of ['Battlefield Marine', 'Resupply', 'Overwhelming Barrage']) {
    await dialog.getByRole('button', { name: 'Add card', exact: true }).click();
    await dialog.getByRole('combobox', { name: 'Search cards' }).fill(name);
    await dialog.getByRole('listbox').getByRole('option').first().click();
  }
  await dialog.getByLabel('Card size', { exact: true }).selectOption('small');
  await dialog.getByLabel('Notes', { exact: true }).fill('Tempo, ramp, and removal.');
  await dialog.getByRole('button', { name: 'Insert widget', exact: true }).click();
  await expect(dialog).toBeHidden();
  const groupCards = surface.locator('[data-widget-kind=card-group]');
  await expect(groupCards.locator('.rte-card-artwork')).toHaveCount(3);
  await expect(groupCards.locator('.rte-card-artwork img').first()).toHaveCSS('height', '180px');
  await groupCards.getByRole('button', { name: 'Edit card-group' }).click();
  await dialog.getByRole('button', { name: 'Remove Resupply', exact: true }).click();
  await dialog.getByLabel('Card size', { exact: true }).selectOption('medium');
  await dialog.getByRole('button', { name: 'Save widget', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(groupCards.locator('.rte-card-artwork')).toHaveCount(2);
  await expect(groupCards.locator('.rte-card-artwork img').first()).toHaveCSS('height', '280px');

  async function chooseMatchupCard(side: string, type: string, searchTerm: string, cardId: string) {
    await page.getByRole('button', { name: `${side} ${type}`, exact: true }).click();
    const selector = page.getByRole('dialog').last();
    await selector.getByPlaceholder('Search', { exact: true }).fill(searchTerm);
    await selector.getByAltText(`card-${cardId}`, { exact: true }).first().click();
    await selector.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(1);
  }
  await slash('matchup');
  await chooseMatchupCard(
    'left',
    'leader',
    'Galvanized Revolutionary',
    'sabine-wren--galvanized-revolutionary',
  );
  await chooseMatchupCard(
    'right',
    'leader',
    'Grand Moff',
    'grand-moff-tarkin--oversector-governor',
  );
  await dialog.getByLabel('Title', { exact: true }).fill('Aggro into control');
  await dialog.getByLabel('Subtitle', { exact: true }).fill('On the play · post-sideboard');
  await dialog.getByLabel('Matchup notes').fill('Trade efficiently, then attack the base.');
  await dialog.getByRole('button', { name: 'Insert widget', exact: true }).click();
  await expect(dialog).toBeHidden();
  const matchup = surface.locator('[data-widget-kind=matchup]');
  await expect(matchup.locator('[data-matchup-side=left]')).toHaveCount(1);
  await expect(matchup.locator('[data-matchup-side=right]')).toHaveCount(1);
  await expect(matchup.locator('[data-base-card]')).toHaveCount(0);
  await expect(matchup).toContainText('Aggro into control');
  await expect(matchup).toContainText('On the play · post-sideboard');
  await expect(matchup).toContainText('Trade efficiently');
  await expect(matchup.locator('.sr-only')).toContainText('Sabine');
  await expect(matchup.locator('p')).not.toContainText('Sabine');
  await expect(matchup.locator('p')).not.toContainText('Tarkin');
  await matchup.getByRole('button', { name: 'Edit matchup' }).click();
  await chooseMatchupCard('left', 'base', 'Command Center', 'command-center');
  await chooseMatchupCard('right', 'base', 'Energy Conversion Lab', 'energy-conversion-lab');
  await dialog.getByRole('button', { name: 'Save widget', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(matchup.locator('[data-base-card]')).toHaveCount(2);
  await expect(matchup.locator('p')).not.toContainText('Command Center');
  await matchup.getByRole('button', { name: 'Edit matchup' }).click();
  await dialog.getByRole('button', { name: 'Remove left base' }).click();
  await dialog.getByRole('button', { name: 'Remove right base' }).click();
  await dialog.getByRole('button', { name: 'Save widget', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(matchup.locator('[data-base-card]')).toHaveCount(0);

  for (const [scope, id, count] of [
    ['tournament', tournamentId, 2],
    ['group', groupId, 3],
  ] as const) {
    await slash('meta-analysis');
    await dialog.getByLabel('Scope', { exact: true }).selectOption(scope);
    await dialog.getByLabel('Tournament or group ID').fill('invalid-id');
    await dialog.getByRole('button', { name: 'Load preview' }).click();
    await expect(dialog.getByRole('alert')).toContainText('valid');
    await dialog.getByLabel('Tournament or group ID').fill(id);
    await dialog.getByRole('button', { name: 'Load preview' }).click();
    await expect(dialog).toContainText(`Total decks analyzed: ${count}`);
    await dialog.getByRole('radio', { name: 'Top 8', exact: true }).click();
    await dialog.getByRole('button', { name: 'Load preview' }).click();
    await expect(dialog.locator('[data-meta-part]')).toHaveAttribute('data-meta-part', 'top8');
    await dialog.getByRole('radio', { name: 'All Decks', exact: true }).click();
    await dialog.getByRole('button', { name: 'Insert widget', exact: true }).click();
    await expect(dialog).toBeHidden();
    const widget = surface.locator(`[data-meta-id="${id}"]`);
    await expect(widget.locator('svg')).not.toHaveCount(0);
    await expect(widget).toContainText(`Total decks analyzed: ${count}`);
  }
  const tournament = surface.locator(`[data-meta-id="${tournamentId}"]`);
  const group = surface.locator(`[data-meta-id="${groupId}"]`);
  const beforeUrl = page.url();
  await tournament.getByRole('radio', { name: 'Top 8', exact: true }).click();
  await expect(tournament).toContainText('Total decks analyzed: 1');
  await expect(group).toContainText('Total decks analyzed: 3');
  expect(page.url()).toBe(beforeUrl);
  await tournament.getByRole('searchbox', { name: 'Highlight leader' }).fill('Sabine');
  await tournament.getByRole('radio', { name: 'Leaders & Bases', exact: true }).click();
  await expect(tournament.locator('[data-meta-info]')).toHaveAttribute(
    'data-meta-info',
    'leadersAndBase',
  );

  console.log('BlockNote widgets and independent chart filters passed');
}

export async function exerciseFormatting(page: Page) {
  const content = page.locator('[contenteditable=true]').first();
  await content.focus();
  await page.keyboard.press('Control+End', { delay: 50 });
  await page.keyboard.type('Bold formatting probe');
  await page.keyboard.press('Shift+Home', { delay: 50 });
  await page.keyboard.press('Control+b');
  await expect(
    content.locator('strong, b, .font-bold').filter({ hasText: 'Bold formatting probe' }).first(),
  ).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Control+Alt+1');
  await page.keyboard.type('Heading probe');
  await expect(content.locator('h1')).toContainText('Heading probe');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Control+Shift+8');
  await page.keyboard.type('List probe');
  await expect(
    content.locator('[data-content-type=bulletListItem]').filter({ hasText: 'List probe' }),
  ).toBeVisible();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
}
