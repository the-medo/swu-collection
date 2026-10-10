// DECK_DISCUSSION_BROWSER_TEST=1 bun --env-file=.env --env-file=.env.worktree frontend/tests/deck-discussion.browser.ts
import { chromium, expect as baseExpect, type BrowserContext, type Request } from 'playwright/test';
import postgres from 'postgres';
import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { getCookies } from 'better-auth/cookies';
import { serializeSignedCookie } from 'better-call';
import { emptyPostDocument, type PostDocument } from '../../shared/posts/content.ts';

const database = new URL(process.env.DATABASE_URL!);
const origin = process.env.BETTER_AUTH_URL!;
if (
  process.env.DECK_DISCUSSION_BROWSER_TEST !== '1' ||
  database.hostname !== '127.0.0.1' ||
  !database.pathname.startsWith('/swubase_')
)
  throw new Error('Explicitly enable this test against an isolated worktree database.');
if (
  !['localhost', '127.0.0.1'].includes(new URL(origin).hostname) &&
  !new URL(origin).hostname.endsWith('.ts.net')
)
  throw new Error('Expected a development origin.');
const expect = baseExpect.configure({ timeout: 20_000 });
const sql = postgres(database.toString(), { max: 2 });
const ownerId = `article-browser-${randomUUID()}`;
const readerId = `comment-browser-${randomUUID()}`;
const publicId = randomUUID();
const privateId = randomUUID();
const unlistedId = randomUUID();
const deckIds = [publicId, privateId, unlistedId];
const folderId = randomUUID();
const browser = await chromium.launch();
const owner = await browser.newContext({ viewport: { width: 1800, height: 1100 } });
const reader = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const anonymous = await browser.newContext({ viewport: { width: 1800, height: 1100 } });
const page = await owner.newPage();
const readerPage = await reader.newPage();
const visitor = await anonymous.newPage();
const errors: string[] = [];
const screenshots = new URL('../../.swubase/deck-discussion-screenshots/', import.meta.url)
  .pathname;
await mkdir(screenshots, { recursive: true });
for (const target of [page, readerPage, visitor]) {
  target.setDefaultTimeout(20_000);
  target.on('pageerror', error => errors.push(error.stack ?? error.message));
  await target.addLocatorHandler(target.getByRole('button', { name: 'Dismiss', exact: true }), () =>
    target.getByRole('button', { name: 'Dismiss', exact: true }).click(),
  );
}
function makeDocument(text: string): PostDocument {
  const content = emptyPostDocument();
  content.blocks[0] = {
    ...content.blocks[0]!,
    type: 'paragraph',
    props: {},
    content: [{ type: 'text', text, styles: {} }],
  };
  return content;
}
async function authenticate(context: BrowserContext, userId: string) {
  const token = randomUUID();
  await sql`INSERT INTO session (id, token, expires_at, user_id, created_at, updated_at) VALUES (${randomUUID()}, ${token}, now() + interval '1 hour', ${userId}, now(), now())`;
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
}
const articleUrl = `${origin}/api/deck/${publicId}/article`;
let commentsUrl: string;
let publicDiscussionId: string;
const commentWrites: { status: number; revision: number }[] = [];
readerPage.on('response', response => {
  if (response.url().startsWith(commentsUrl + '/') && response.request().method() === 'PUT') {
    commentWrites.push({
      status: response.status(),
      revision: response.request().postDataJSON().revision,
    });
  }
});
try {
  for (const [id, name] of [
    [ownerId, 'Deck article author'],
    [readerId, 'Deck comment author'],
  ]) {
    await sql`INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at, display_name, currency, role) VALUES (${id!}, ${name!}, ${id + '@invalid.local'}, false, now(), now(), ${name + ' ' + id!.slice(-8)}, 'USD', 'user')`;
  }
  const ownerAvatar = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" fill="gold"/></svg>')}`;
  await sql`UPDATE "user" SET image = ${ownerAvatar} WHERE id = ${ownerId}`;
  for (const [index, id] of deckIds.entries()) {
    await sql`INSERT INTO deck (id, user_id, format, name, public, leader_card_id_1, base_card_id) VALUES (${id}, ${ownerId}, 1, ${'Article fixture ' + ['public', 'private', 'unlisted'][index]}, ${[1, 0, 2][index]!}, 'sabine-wren--galvanized-revolutionary', 'command-center')`;
    await sql`INSERT INTO deck_information (deck_id) VALUES (${id})`;
    await sql`INSERT INTO deck_card (deck_id, card_id, board, quantity) VALUES (${id}, 'battlefield-marine', 1, 3), (${id}, 'overwhelming-barrage', 2, 2), (${id}, 'resupply', 3, 1)`;
  }
  publicDiscussionId = (
    await sql`SELECT discussion_id FROM deck_discussion WHERE deck_id = ${publicId}`
  )[0]!.discussion_id;
  commentsUrl = `${origin}/api/discussions/${publicDiscussionId}/comments`;
  await sql`INSERT INTO user_settings (user_id, key, value) VALUES (${ownerId}, 'collectionInfoInDecks', 'true')`;
  await authenticate(owner, ownerId);
  await authenticate(reader, readerId);
  await page.goto(`${origin}/decks/${publicId}`);
  // Signed fixture sessions bypass the login flow that copies settings into Dexie.
  await page.evaluate(async path => {
    const { saveUserSetting } = await import(path);
    await saveUserSetting('collectionInfoInDecks', true);
  }, '/src/dexie/userSettings.ts');
  const column = page.getByRole('region', { name: 'Deck guide and comments', exact: true });
  await expect(page.getByRole('tab', { name: 'Guide (0)', exact: true })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Guide (0)', exact: true })).toHaveText('(0)');
  await expect(
    page.getByRole('tab', { name: 'Guide (0)', exact: true }).locator('svg'),
  ).toBeVisible();
  await expect(column).toHaveCount(0);
  const guideButton = page.getByRole('button', { name: 'Guide', exact: true });
  const deckbuilderButton = page.getByRole('button', { name: 'Deckbuilder', exact: true });
  await expect(guideButton).toBeVisible();
  const guideBounds = await guideButton.boundingBox();
  const deckbuilderBounds = await deckbuilderButton.boundingBox();
  expect(guideBounds!.width).toBeCloseTo(deckbuilderBounds!.width, 0);
  expect(guideBounds!.height).toBeCloseTo(deckbuilderBounds!.height, 0);
  expect(deckbuilderBounds!.y).toBeLessThan(guideBounds!.y);
  const actionStyle = (button: HTMLElement) => {
    const style = getComputedStyle(button);
    return {
      background: style.backgroundImage,
      borderColor: style.borderColor,
      borderRadius: style.borderRadius,
      color: style.color,
      iconColor: getComputedStyle(button.querySelector('svg')!).color,
    };
  };
  expect(await guideButton.evaluate(actionStyle)).toEqual(
    await deckbuilderButton.evaluate(actionStyle),
  );
  await visitor.goto(`${origin}/decks/${unlistedId}?deckTab=article`);
  await expect(visitor.getByText('No comments yet.', { exact: true })).toBeVisible();
  await expect(visitor.getByRole('button', { name: 'Guide', exact: true })).toHaveCount(0);
  await expect(visitor.getByRole('region', { name: 'Deck guide', exact: true })).toHaveCount(0);
  await page.getByRole('tab', { name: 'Charts', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/decks/${publicId}\\?deckTab=charts`));
  await page.reload();
  await expect(page.getByRole('tab', { name: 'Charts', exact: true })).toHaveAttribute(
    'data-state',
    'active',
  );
  await page.getByRole('tab', { name: /^Collections/ }).click();
  await expect(page).toHaveURL(/deckTab=collection/);
  await page.reload();
  await expect(page.getByRole('tab', { name: /^Collections/ })).toHaveAttribute(
    'data-state',
    'active',
  );
  await page.goBack();
  await expect(page.getByRole('tab', { name: 'Charts', exact: true })).toHaveAttribute(
    'data-state',
    'active',
  );
  await page.goForward();
  await expect(page.getByRole('tab', { name: /^Collections/ })).toHaveAttribute(
    'data-state',
    'active',
  );
  await page.getByRole('tab', { name: 'Decklist', exact: true }).click();
  await expect(page).toHaveURL(`${origin}/decks/${publicId}`);
  await guideButton.click();
  await expect(page).toHaveURL(/deckTab=article/);
  await expect(page.getByRole('tab', { name: 'Guide (0)', exact: true })).toHaveAttribute(
    'data-state',
    'active',
  );
  await expect(column.getByRole('button', { name: 'Write guide' })).toBeVisible();
  await expect(column.getByText('No comments yet.', { exact: false })).toBeVisible();
  await column.screenshot({ path: `${screenshots}/empty-desktop.png` });
  await page.locator('div:has(> svg.lucide-sun):has(> svg.lucide-moon)').first().click();
  await column.screenshot({ path: `${screenshots}/empty-desktop-other-theme.png` });
  await page.locator('div:has(> svg.lucide-sun):has(> svg.lucide-moon)').first().click();
  await page.setViewportSize({ width: 390, height: 844 });
  await column.scrollIntoViewIfNeeded();
  await column.screenshot({ path: `${screenshots}/empty-mobile.png` });
  await page.setViewportSize({ width: 1800, height: 1100 });
  await column.getByRole('button', { name: 'Write guide' }).click();
  await expect(page).toHaveURL(/deckArticleEdit=true/);
  let form = page.getByRole('group', { name: 'Edit guide', exact: true });
  await expect(form.locator('[contenteditable=true]').first()).toBeVisible();
  await form.locator('[contenteditable=true]').first().fill('How to play this deck.');
  await expect(form.getByRole('group', { name: 'Insert SWUBASE content' })).toHaveCount(0);
  await form.locator('[contenteditable=true]').first().focus();
  await page.keyboard.press('Control+End');
  await page.keyboard.type(' /card-link');
  await expect(page.getByRole('option').filter({ hasText: 'Card link' }).first()).toBeVisible();
  await page.keyboard.press('Enter');
  const picker = page.getByRole('dialog');
  await picker.getByRole('combobox', { name: 'Search cards' }).fill('Battlefield Marine');
  await expect(picker.getByRole('listbox').getByRole('option')).toHaveCount(1);
  await page.keyboard.press('Enter');
  await expect(picker).toBeHidden();
  await form.locator('[contenteditable=true]').first().focus();
  await page.keyboard.press('Control+End');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await form.getByRole('button', { name: 'Save guide', exact: true }).click();
  expect((await (await page.request.get(articleUrl)).json()).data.content.blocks).toHaveLength(1);
  const article = page.getByRole('region', { name: 'Deck guide', exact: true });
  await expect(article.getByRole('button', { name: 'Edit guide' })).toBeVisible();
  await expect(article).toContainText('How to play this deck.');
  await expect(article.locator('.rte-card-link')).toContainText('Battlefield Marine');
  await expect(page.getByRole('tab', { name: 'Guide (0)', exact: true })).toBeVisible();
  await expect(page).not.toHaveURL(/deckArticleEdit/);
  await page.goBack();
  await expect(form).toHaveCount(0);
  await expect(page.getByRole('tab', { name: 'Decklist', exact: true })).toHaveAttribute(
    'data-state',
    'active',
  );
  await page.goForward();
  await expect(form).toHaveCount(0);
  await expect(article.getByRole('button', { name: 'Edit guide' })).toBeVisible();
  await visitor.goto(`${origin}/decks/${publicId}?deckTab=invalid&deckArticleEdit=1`);
  await expect(visitor.getByRole('tab', { name: 'Decklist', exact: true })).toHaveAttribute(
    'data-state',
    'active',
  );
  await visitor.goto(`${origin}/decks/${publicId}?deckTab=collection`);
  await expect(visitor.getByRole('tab', { name: 'Decklist', exact: true })).toHaveAttribute(
    'data-state',
    'active',
  );
  await visitor.goto(`${origin}/decks/${publicId}`);
  const visitorColumn = visitor.getByRole('region', {
    name: 'Deck guide and comments',
    exact: true,
  });
  await expect(visitorColumn).toHaveCount(0);
  await visitor.getByRole('button', { name: 'Guide', exact: true }).click();
  await expect(visitor).toHaveURL(/deckTab=article/);
  await expect(visitorColumn).toContainText('How to play this deck.');
  await expect(visitorColumn.getByRole('button', { name: 'Edit guide' })).toHaveCount(0);
  await expect(visitorColumn.getByRole('button', { name: 'Sign in to comment' })).toBeVisible();
  await visitor.reload();
  await expect(visitor.getByRole('tab', { name: 'Guide (0)', exact: true })).toHaveAttribute(
    'data-state',
    'active',
  );
  await expect(visitor.getByRole('region', { name: 'Deck guide', exact: true })).toContainText(
    'How to play this deck.',
  );
  console.log('Deck subpage URL/history and article publishing passed.');

  await readerPage.goto(`${origin}/decks/${publicId}?deckTab=article`);
  const comments = readerPage.getByRole('region', { name: 'Deck comments', exact: true });
  const sidebarTop = () =>
    readerPage
      .locator('[data-deck-sidebar]')
      .evaluate(
        element =>
          element.getBoundingClientRect().top - element.parentElement!.getBoundingClientRect().top,
      );
  const sidebarBefore = await sidebarTop();
  await comments.getByRole('button', { name: 'Write a comment' }).click();
  const commentForm = readerPage.getByRole('group', { name: 'Edit comment', exact: true });
  await expect(commentForm.locator('[contenteditable=true]').first()).toBeVisible();
  const sidebarAfter = await sidebarTop();
  expect(Math.abs(sidebarAfter - sidebarBefore)).toBeLessThan(2);
  expect(sidebarAfter).toBeLessThan(2);
  expect((await commentForm.locator('.bn-editor').boundingBox())!.height).toBeLessThan(200);
  await expect(commentForm.getByRole('group', { name: 'Insert SWUBASE content' })).toHaveCount(0);
  await expect(commentForm.locator('[data-editor-type=comments]')).toBeVisible();
  await expect(commentForm.getByRole('button', { name: 'Mention a user' })).toHaveCount(0);
  const commentEditor = commentForm.locator('[contenteditable=true]').first();
  await commentEditor.fill('');
  await readerPage.keyboard.type('/heading');
  await expect(
    readerPage.getByRole('option').filter({ hasText: 'Heading 4' }).first(),
  ).toBeVisible();
  await expect(
    readerPage.getByRole('option').filter({ hasText: /Heading [123](?:\s|$)/ }),
  ).toHaveCount(0);
  await readerPage.keyboard.press('Escape');
  await commentEditor.fill('Keyboard heading restriction');
  await readerPage.keyboard.press('Control+Alt+1');
  await expect(commentForm.locator('[data-content-type=heading]')).toHaveCount(0);
  // Pasted article headings retain their text within the allowed comment formatting.
  await commentEditor.fill('');
  await commentEditor.evaluate(element => {
    const clipboardData = new DataTransfer();
    clipboardData.setData('text/html', '<h1>Pasted heading</h1><p>After heading</p>');
    clipboardData.setData('text/plain', 'Pasted heading\nAfter heading');
    element.dispatchEvent(
      new ClipboardEvent('paste', { clipboardData, bubbles: true, cancelable: true }),
    );
  });
  await expect(commentForm.locator('h1,h2,h3')).toHaveCount(0);
  await expect(commentForm).toContainText('Pasted heading');
  const copiedCardHtml = await readerPage
    .locator('.rte-card-link')
    .first()
    .evaluate(
      element => element.closest('[data-inline-content-type]')?.outerHTML ?? element.outerHTML,
    );
  await commentEditor.fill('');
  await commentEditor.evaluate((element, cardHtml) => {
    const clipboardData = new DataTransfer();
    clipboardData.setData('text/html', `<p>Copied card ${cardHtml}</p><p>Keep this prose.</p>`);
    clipboardData.setData('text/plain', 'Copied card Battlefield Marine\nKeep this prose.');
    element.dispatchEvent(
      new ClipboardEvent('paste', { clipboardData, bubbles: true, cancelable: true }),
    );
  }, copiedCardHtml);
  await expect(commentForm).toContainText('Battlefield Marine');
  await expect(commentForm.locator('.rte-card-link')).toHaveCount(1);
  await expect(commentForm.locator('a[href="/cards/detail/battlefield-marine"]')).toContainText(
    'Battlefield Marine',
  );
  await commentEditor.focus();
  await readerPage.keyboard.press('Control+A');
  await readerPage.keyboard.press('Backspace');
  await readerPage.keyboard.type('I like this matchup guide. ');
  await readerPage.keyboard.type('@');
  const users = readerPage.getByRole('dialog', { name: 'Mention a user' });
  await users.getByRole('combobox', { name: 'Search users' }).fill(ownerId.slice(-8));
  await users.getByRole('option').filter({ hasText: 'Deck article author' }).click();
  await expect(users).toBeHidden();
  const mentionedOwner = (await sql`SELECT display_name FROM "user" WHERE id = ${ownerId}`)[0]!
    .display_name;
  const mentionProfile = readerPage.getByRole('dialog', {
    name: `${mentionedOwner}'s profile`,
    exact: true,
  });
  const mentionUrl = readerPage.url();
  await commentForm.locator('.rte-mention').click();
  await expect(mentionProfile.getByRole('link', { name: 'Open profile' })).toHaveAttribute(
    'href',
    `/users/${ownerId}`,
  );
  await expect(
    mentionProfile.getByRole('img', { name: mentionedOwner, exact: true }),
  ).toHaveAttribute('src', ownerAvatar);
  expect(readerPage.url()).toBe(mentionUrl);
  await readerPage.keyboard.press('Escape');
  await commentEditor.focus();
  await readerPage.keyboard.press('Control+End');
  await readerPage.keyboard.type(' /card-link');
  await expect(
    readerPage.getByRole('option').filter({ hasText: 'Card link' }).first(),
  ).toBeVisible();
  await readerPage.keyboard.press('Enter');
  const cardPicker = readerPage.getByRole('dialog');
  await cardPicker.getByRole('combobox', { name: 'Search cards' }).fill('Battlefield Marine');
  await expect(cardPicker.getByRole('listbox').getByRole('option')).toHaveCount(1);
  await readerPage.keyboard.press('Enter');
  await expect(cardPicker).toBeHidden();
  await expect(commentForm.locator('.rte-card-link')).toHaveAttribute(
    'href',
    '/cards/detail/battlefield-marine',
  );
  await commentEditor.focus();
  await readerPage.keyboard.press('Control+End');
  await readerPage.keyboard.press('Enter');
  await readerPage.keyboard.press('Enter');
  await commentForm.getByRole('button', { name: 'Post comment', exact: true }).click();
  await expect(comments).toContainText('I like this matchup guide.');
  await expect(comments.getByRole('heading', { name: /Comments\s*\(1\)/ })).toBeVisible();
  await expect(readerPage.getByRole('tab', { name: 'Guide (1)', exact: true })).toBeVisible();
  await comments.locator('.rte-mention').click();
  await expect(mentionProfile.getByRole('link', { name: 'Open profile' })).toHaveAttribute(
    'href',
    `/users/${ownerId}`,
  );
  await readerPage.keyboard.press('Escape');
  await readerPage.reload();
  await comments.locator('.rte-mention').focus();
  await readerPage.keyboard.press('Enter');
  await expect(
    mentionProfile.getByRole('img', { name: mentionedOwner, exact: true }),
  ).toHaveAttribute('src', ownerAvatar);
  await readerPage.keyboard.press('Escape');
  await expect(comments.locator('.rte-mention')).toBeFocused();
  await expect(comments.locator('.rte-card-link')).toHaveAttribute(
    'href',
    '/cards/detail/battlefield-marine',
  );
  console.log(
    'Header-free editors, comment card-link insertion/paste/persistence, headings and mentions passed.',
  );
  const firstComment = (await (await readerPage.request.get(commentsUrl)).json()).data[0];
  expect(firstComment.content.blocks).toHaveLength(1);
  const firstCard = comments.locator(`[data-comment-id="${firstComment.id}"]`);
  const authorButton = firstCard.getByRole('button', {
    name: firstComment.author.displayName,
    exact: true,
  });
  const nameBounds = await authorButton.boundingBox();
  const timeBounds = await firstCard.locator('time').boundingBox();
  const avatarBounds = await firstCard.locator('[data-comment-avatar]').boundingBox();
  expect(timeBounds!.x).toBeGreaterThan(nameBounds!.x + nameBounds!.width);
  expect(avatarBounds!.x).toBeLessThan(nameBounds!.x);
  await authorButton.click();
  const profile = readerPage.getByRole('dialog', {
    name: `${firstComment.author.displayName}'s profile`,
  });
  await expect(profile.getByRole('link', { name: 'Open profile' })).toHaveAttribute(
    'href',
    `/users/${readerId}`,
  );
  await expect(profile.locator('.rounded-full').first()).toBeVisible();
  await readerPage.keyboard.press('Escape');

  await comments.getByRole('button', { name: 'Edit comment' }).click();
  await commentForm.locator('[contenteditable=true]').first().fill('Keep this edited draft.');
  const legacyComment = makeDocument('Changed in another tab.');
  legacyComment.blocks[0]!.props = firstComment.content.blocks[0].props;
  legacyComment.blocks.push(emptyPostDocument().blocks[0]!, emptyPostDocument().blocks[0]!);
  expect(
    (
      await readerPage.request.put(`${commentsUrl}/${firstComment.id}`, {
        data: { content: legacyComment, revision: firstComment.revision },
      })
    ).status(),
  ).toBe(200);
  await commentForm.getByRole('button', { name: 'Save comment', exact: true }).click();
  await expect(commentForm.getByRole('alert')).toContainText('changed in another tab');
  await expect(commentForm).toContainText('Keep this edited draft.');
  readerPage.once('dialog', dialog => dialog.dismiss());
  await readerPage.getByRole('tab', { name: 'Charts', exact: true }).click();
  await expect(readerPage.getByRole('tab', { name: 'Guide (1)', exact: true })).toHaveAttribute(
    'data-state',
    'active',
  );
  await expect(commentForm).toContainText('Keep this edited draft.');
  readerPage.once('dialog', dialog => dialog.accept());
  await commentForm.getByRole('button', { name: 'Load saved comment' }).click();
  await expect(commentForm).toContainText('Changed in another tab.');
  await expect(commentForm).not.toContainText('Keep this edited draft.');
  await expect(
    commentForm.getByRole('button', { name: 'Save comment', exact: true }),
  ).toBeDisabled();
  await commentForm.locator('[contenteditable=true]').first().fill('Final comment.');
  await commentForm.getByRole('button', { name: 'Save comment', exact: true }).click();
  await expect(comments).toContainText('Final comment.');
  await comments.getByRole('button', { name: 'Write a comment' }).click();
  await commentForm
    .locator('[contenteditable=true]')
    .first()
    .fill('Keep this draft after a network failure.');
  await readerPage.route(`**/api/discussions/${publicDiscussionId}/comments`, async route => {
    if (route.request().method() === 'POST')
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Temporarily unavailable.' }),
      });
    else await route.continue();
  });
  await commentForm.getByRole('button', { name: 'Post comment', exact: true }).click();
  await expect(commentForm.getByRole('alert')).toContainText('Temporarily unavailable.');
  await expect(commentForm).toContainText('Keep this draft after a network failure.');
  await readerPage.unroute(`**/api/discussions/${publicDiscussionId}/comments`);
  await commentForm.getByRole('button', { name: 'Post comment', exact: true }).click();
  await expect(comments).toContainText('Keep this draft after a network failure.');

  await comments.getByRole('button', { name: 'Edit comment' }).last().click();
  await commentForm
    .locator('[contenteditable=true]')
    .first()
    .fill('Recovered deleted comment draft.');
  expect((await page.request.delete(`${commentsUrl}/${firstComment.id}`)).status()).toBe(200);
  await commentForm.getByRole('button', { name: 'Save comment', exact: true }).click();
  await expect(commentForm.getByRole('button', { name: 'Post as new comment' })).toBeVisible();
  await expect(commentForm).toContainText('Recovered deleted comment draft.');
  await commentForm.getByRole('button', { name: 'Post as new comment' }).click();
  await expect(comments).toContainText('Recovered deleted comment draft.');

  await article.getByRole('button', { name: 'Edit guide' }).click();
  form = page.getByRole('group', { name: 'Edit guide', exact: true });
  await form.locator('[contenteditable=true]').first().focus();
  await page.keyboard.press('Control+End');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Unsaved owner draft.');
  const saved = (await (await page.request.get(articleUrl)).json()).data;
  expect(
    (
      await page.request.put(articleUrl, {
        data: { content: makeDocument('Another tab article.'), revision: saved.revision },
      })
    ).status(),
  ).toBe(200);
  await form.getByRole('button', { name: 'Save guide', exact: true }).click();
  await expect(form.getByRole('alert')).toContainText('changed in another tab');
  await expect(form).toContainText('Unsaved owner draft.');
  page.once('dialog', dialog => dialog.accept());
  await form.getByRole('button', { name: 'Save my version instead' }).click();
  await expect(article.getByRole('button', { name: 'Edit guide' })).toBeVisible();
  await expect(article).toContainText('Unsaved owner draft.');
  await page.reload();
  await expect(article).toContainText('Unsaved owner draft.');
  await article.getByRole('button', { name: 'Edit guide' }).click();
  await form.locator('[contenteditable=true]').first().focus();
  await page.keyboard.press('Control+End');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Cancel this paragraph.');
  page.once('dialog', dialog => dialog.accept());
  await form.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(article.getByRole('button', { name: 'Edit guide' })).toBeVisible();
  await expect(article).not.toContainText('Cancel this paragraph.');
  await page.goBack();
  await expect(form).toHaveCount(0);
  await expect(page.getByRole('tab', { name: 'Decklist', exact: true })).toHaveAttribute(
    'data-state',
    'active',
  );
  await page.goForward();
  await expect(form).toHaveCount(0);
  await expect(article.getByRole('button', { name: 'Edit guide' })).toBeVisible();
  await page.getByRole('tab', { name: 'Decklist', exact: true }).click();
  await expect(column).toHaveCount(0);
  await page.getByRole('button', { name: 'Guide', exact: true }).click();
  await expect(column).toContainText('Unsaved owner draft.');
  await expect(column).toContainText('Recovered deleted comment draft.');
  const ownerComments = page.getByRole('region', { name: 'Deck comments', exact: true });
  await expect(ownerComments.getByRole('button', { name: 'Edit comment' })).toHaveCount(0);
  await expect(ownerComments.getByRole('button', { name: 'Delete comment' })).toHaveCount(2);
  page.once('dialog', dialog => dialog.accept());
  await ownerComments
    .getByRole('article')
    .filter({ hasText: 'Recovered deleted comment draft.' })
    .getByRole('button', { name: 'Delete comment' })
    .click();
  await expect(ownerComments).not.toContainText('Recovered deleted comment draft.');
  await expect(ownerComments.getByRole('button', { name: 'Delete comment' })).toHaveCount(1);
  await column.screenshot({ path: `${screenshots}/article-comments-desktop.png` });
  await page.screenshot({ path: `${screenshots}/desktop.png`, fullPage: true });
  await page.locator('div:has(> svg.lucide-sun):has(> svg.lucide-moon)').first().click();
  await page.screenshot({ path: `${screenshots}/desktop-other-theme.png`, fullPage: true });
  for (const width of [1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect(column).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    const bounds = await column.boundingBox();
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
    expect(
      (await page.locator('[data-sidebar="sidebar"]').first().boundingBox())!.width,
    ).toBeGreaterThanOrEqual(200);
    await expect(page.getByRole('tab', { name: 'Guide (1)', exact: true })).toHaveAttribute(
      'data-state',
      'active',
    );
    await page.screenshot({ path: `${screenshots}/desktop-${width}.png`, fullPage: true });
  }
  await page.setViewportSize({ width: 1100, height: 1000 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('tab', { name: 'Decklist', exact: true }).click();
  await page.getByRole('button', { name: 'Guide', exact: true }).click();
  await expect(article).toBeInViewport();
  await expect(column).toBeVisible();
  const mobileBounds = await column.boundingBox();
  expect(mobileBounds!.x).toBeGreaterThanOrEqual(0);
  expect(mobileBounds!.x + mobileBounds!.width).toBeLessThanOrEqual(390);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: `${screenshots}/mobile.png`, fullPage: true });
  await column.screenshot({ path: `${screenshots}/article-comments-mobile.png` });
  await page.reload();
  await page.getByRole('button', { name: 'Guide', exact: true }).click();
  await expect(article).toBeInViewport();
  await expect(article).toContainText('Unsaved owner draft.');
  await page.screenshot({ path: `${screenshots}/mobile-article.png`, fullPage: true });

  expect(
    (
      await page.request.put(`${origin}/api/deck/${privateId}/article`, {
        data: { content: makeDocument('Private strategy.'), revision: null },
      })
    ).status(),
  ).toBe(200);
  expect(
    (
      await page.request.put(`${origin}/api/deck/${unlistedId}/article`, {
        data: { content: makeDocument('Unlisted strategy.'), revision: null },
      })
    ).status(),
  ).toBe(200);
  expect((await visitor.request.get(`${origin}/api/deck/${privateId}/article`)).status()).toBe(404);
  await sql`INSERT INTO deck_folder (id, user_id, name) VALUES (${folderId}, ${ownerId}, 'Article shared fixture')`;
  await sql`INSERT INTO deck_folder_deck (deck_id, folder_id) VALUES (${privateId}, ${folderId})`;
  await sql`INSERT INTO deck_folder_share (folder_id, user_id, audience) VALUES (${folderId}, ${ownerId}, 'link')`;
  await readerPage.goto(`${origin}/decks/${privateId}?deckTab=article`);
  await expect(readerPage.getByRole('region', { name: 'Deck guide', exact: true })).toContainText(
    'Private strategy.',
  );
  const privateComments = readerPage.getByRole('region', { name: 'Deck comments', exact: true });
  await privateComments.getByRole('button', { name: 'Write a comment' }).click();
  await commentForm
    .locator('[contenteditable=true]')
    .first()
    .fill('Private share comment to remove.');
  await commentForm.getByRole('button', { name: 'Post comment', exact: true }).click();
  await expect(privateComments).toContainText('Private share comment to remove.');
  expect(
    (
      await page.request.post(`${origin}/api/deck/${privateId}/comments`, {
        data: { content: makeDocument('Owner private comment stays hidden.') },
      })
    ).status(),
  ).toBe(201);
  await privateComments.getByRole('button', { name: 'Edit comment' }).click();
  await commentForm.locator('[contenteditable=true]').first().fill('Unsaved after access revoked.');
  await sql`DELETE FROM deck_folder_share WHERE folder_id = ${folderId}`;
  await commentForm.getByRole('button', { name: 'Save comment', exact: true }).click();
  await expect(commentForm.getByRole('alert')).toContainText('do not have access');
  await expect(commentForm.getByRole('button', { name: 'Post as new comment' })).toHaveCount(0);
  await expect(commentForm).toContainText('Unsaved after access revoked.');
  await expect(
    readerPage.getByRole('region', { name: 'Your comments on this deck', exact: true }),
  ).toContainText('Private share comment to remove.');
  await expect(privateComments).not.toContainText('Owner private comment stays hidden.');
  await expect(readerPage.getByText('Private strategy.', { exact: true })).toHaveCount(0, {
    timeout: 5000,
  });
  readerPage.once('dialog', dialog => dialog.accept());
  await commentForm.getByRole('button', { name: 'Cancel', exact: true }).click();
  await readerPage.reload();
  const ownComments = readerPage.getByRole('region', {
    name: 'Your comments on this deck',
    exact: true,
  });
  await expect(ownComments).toContainText('Private share comment to remove.');
  await expect(ownComments).not.toContainText('Owner private comment stays hidden.');
  await expect(readerPage.getByRole('region', { name: 'Deck guide', exact: true })).toHaveCount(0);
  readerPage.once('dialog', dialog => dialog.accept());
  await ownComments.getByRole('button', { name: 'Delete comment' }).click();
  await expect(ownComments).toHaveCount(0);
  const privateRemaining = (
    await (await page.request.get(`${origin}/api/deck/${privateId}/comments`)).json()
  ).data;
  expect(privateRemaining).toHaveLength(1);
  expect(JSON.stringify(privateRemaining[0].content)).toContain(
    'Owner private comment stays hidden.',
  );
  await visitor.goto(`${origin}/decks/${privateId}?deckTab=article`);
  await expect(visitor.getByText('Deck not found', { exact: true })).toBeVisible();
  await visitor.goto(`${origin}/decks/${unlistedId}?deckTab=article`);
  await expect(visitor.getByRole('region', { name: 'Deck guide', exact: true })).toContainText(
    'Unlisted strategy.',
  );
  const unlistedCommentsUrl = `${origin}/api/deck/${unlistedId}/comments`;
  for (let index = 0; index < 25; index++)
    expect(
      (
        await page.request.post(unlistedCommentsUrl, {
          data: { content: makeDocument(`Pagination comment ${index}`) },
        })
      ).status(),
    ).toBe(201);
  await visitor.reload();
  const paginatedComments = visitor.getByRole('region', { name: 'Deck comments', exact: true });
  await expect(paginatedComments.getByRole('article')).toHaveCount(20);
  await expect(visitor.getByRole('tab', { name: 'Guide (25)', exact: true })).toBeVisible();
  await paginatedComments.getByRole('button', { name: 'Load more comments' }).click();
  await expect(paginatedComments.getByRole('article')).toHaveCount(25);
  await expect(paginatedComments.getByRole('button', { name: 'Load more comments' })).toHaveCount(
    0,
  );
  const unlistedArticle = (
    await (await page.request.get(`${origin}/api/deck/${unlistedId}/article`)).json()
  ).data;
  expect(
    (
      await page.request.put(`${origin}/api/deck/${unlistedId}/article`, {
        data: { content: emptyPostDocument(), revision: unlistedArticle.revision },
      })
    ).status(),
  ).toBe(200);
  await visitor.reload();
  await expect(visitor.getByRole('tab', { name: 'Comments (25)', exact: true })).toHaveAttribute(
    'data-state',
    'active',
  );
  await expect(visitor).toHaveURL(/deckTab=article/);
  await expect(visitor.getByRole('region', { name: 'Deck guide', exact: true })).toHaveCount(0);
  await expect(visitor.getByRole('button', { name: 'Guide', exact: true })).toHaveCount(0);

  await readerPage.goto(`${origin}/decks/${unlistedId}?deckTab=article`);
  const threads = readerPage.getByRole('region', { name: 'Deck comments', exact: true });
  await expect(threads.locator('[data-comment-thread]')).toHaveCount(20);
  const multipleRootIds = await threads
    .locator('[data-comment-thread]')
    .evaluateAll(nodes => nodes.slice(0, 5).map(node => node.getAttribute('data-comment-thread')!));
  const multiThread = (id: string) => threads.locator(`[data-comment-thread="${id}"]`);
  const multiForm = (id: string) =>
    readerPage
      .locator(`[data-comment-composer="${id}"]`)
      .getByRole('group', { name: 'Edit comment', exact: true });
  const startReply = (id: string) =>
    threads
      .locator(`[data-comment-id="${id}"]`)
      .getByRole('button', { name: 'Reply', exact: true })
      .click();
  await startReply(multipleRootIds[0]!);
  await expect(multiForm(multipleRootIds[0]!)).toBeVisible();
  await startReply(multipleRootIds[1]!);
  await expect(multiForm(multipleRootIds[0]!)).toHaveCount(0);
  await expect(commentForm).toHaveCount(1);
  await multiForm(multipleRootIds[1]!)
    .locator('[contenteditable=true]')
    .first()
    .fill('Independent reply draft A.');
  await startReply(multipleRootIds[2]!);
  await multiForm(multipleRootIds[2]!)
    .locator('[contenteditable=true]')
    .first()
    .fill('Independent reply draft B.');
  await expect(commentForm).toHaveCount(2);
  await expect(
    multiThread(multipleRootIds[1]!).getByRole('group', { name: 'Edit comment', exact: true }),
  ).toContainText('Independent reply draft A.');
  await expect(
    multiThread(multipleRootIds[2]!).getByRole('group', { name: 'Edit comment', exact: true }),
  ).toContainText('Independent reply draft B.');
  const editorB = await multiForm(multipleRootIds[2]!)
    .locator('[contenteditable=true]')
    .first()
    .elementHandle();
  let leavePrompts = 0;
  readerPage.once('dialog', dialog => {
    leavePrompts++;
    return dialog.dismiss();
  });
  await readerPage.getByRole('tab', { name: 'Decklist', exact: true }).click();
  await expect(readerPage).toHaveURL(/deckTab=article/);
  expect(leavePrompts).toBe(1);
  await expect(commentForm).toHaveCount(2);
  await readerPage.setViewportSize({ width: 390, height: 844 });
  expect(
    await readerPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBe(true);
  await multiThread(multipleRootIds[2]!).screenshot({
    path: `${screenshots}/multiple-replies-mobile.png`,
  });
  await readerPage.setViewportSize({ width: 1440, height: 1000 });
  let releaseFirstWrite!: () => void;
  const firstWriteGate = new Promise<void>(resolve => {
    releaseFirstWrite = resolve;
  });
  const commentWriteUrl = '**/api/discussions/*/comments';
  await readerPage.route(commentWriteUrl, async route => {
    if (
      route.request().method() === 'POST' &&
      route.request().postDataJSON().parentId === multipleRootIds[1]
    )
      await firstWriteGate;
    await route.continue();
  });
  try {
    await multiForm(multipleRootIds[1]!)
      .getByRole('button', { name: 'Post reply', exact: true })
      .click();
    await expect(
      multiForm(multipleRootIds[1]!).getByRole('button', { name: 'Saving…', exact: true }),
    ).toBeVisible();
    await expect(
      multiForm(multipleRootIds[2]!).getByRole('button', { name: 'Post reply', exact: true }),
    ).toBeEnabled();
    expect(
      await multiForm(multipleRootIds[2]!)
        .locator('[contenteditable=true]')
        .first()
        .evaluate((node, previous) => node === previous, editorB),
    ).toBe(true);
    await multiForm(multipleRootIds[2]!)
      .locator('[contenteditable=true]')
      .first()
      .fill('Independent reply draft B. Still editable while A saves.');
    await multiForm(multipleRootIds[2]!)
      .getByRole('button', { name: 'Post reply', exact: true })
      .click();
    await expect(multiForm(multipleRootIds[2]!)).toHaveCount(0);
    await expect(multiForm(multipleRootIds[1]!)).toContainText('Independent reply draft A.');
    await expect(
      multiForm(multipleRootIds[1]!).getByRole('button', { name: 'Saving…', exact: true }),
    ).toBeVisible();
  } finally {
    releaseFirstWrite();
  }
  await expect(commentForm).toHaveCount(0);
  await readerPage.unroute(commentWriteUrl);
  for (const [id, text] of [
    [multipleRootIds[1]!, 'Independent reply draft A.'],
    [multipleRootIds[2]!, 'Independent reply draft B.'],
  ]) {
    const saved = (
      await (await readerPage.request.get(`${unlistedCommentsUrl}?parentId=${id}`)).json()
    ).data;
    expect(
      saved.some(
        comment => comment.parentId === id && JSON.stringify(comment.content).includes(text!),
      ),
    ).toBe(true);
  }
  await startReply(multipleRootIds[3]!);
  await multiForm(multipleRootIds[3]!)
    .locator('[contenteditable=true]')
    .first()
    .fill('Draft whose parent disappears.');
  const movingEditor = await multiForm(multipleRootIds[3]!)
    .locator('[contenteditable=true]')
    .first()
    .elementHandle();
  await startReply(multipleRootIds[4]!);
  await multiForm(multipleRootIds[4]!)
    .locator('[contenteditable=true]')
    .first()
    .fill('Draft that stays inline.');
  expect((await page.request.delete(`${unlistedCommentsUrl}/${multipleRootIds[3]}`)).status()).toBe(
    200,
  );
  const multiDiscussion = (
    await (await readerPage.request.get(`${unlistedCommentsUrl}?limit=1`)).json()
  ).data[0].discussionId;
  await readerPage.evaluate(async id => {
    const { queryClient } = await import('/src/queryClient.ts');
    const { discussionKeys } = await import('/src/api/discussions/queryKeys.ts');
    await queryClient.invalidateQueries({ queryKey: discussionKeys.discussion(id) });
  }, multiDiscussion);
  await expect(threads.locator(`[data-comment-id="${multipleRootIds[3]}"]`)).toHaveCount(0);
  await expect(multiForm(multipleRootIds[3]!)).toContainText('Draft whose parent disappears.');
  expect(
    await multiForm(multipleRootIds[3]!)
      .locator('[contenteditable=true]')
      .first()
      .evaluate((node, previous) => node === previous, movingEditor),
  ).toBe(true);
  await expect(
    multiThread(multipleRootIds[4]!).getByRole('group', { name: 'Edit comment', exact: true }),
  ).toContainText('Draft that stays inline.');
  for (const id of [multipleRootIds[3]!, multipleRootIds[4]!]) {
    readerPage.once('dialog', dialog => dialog.accept());
    await multiForm(id).getByRole('button', { name: 'Cancel', exact: true }).click();
  }
  await expect(commentForm).toHaveCount(0);
  console.log(
    'Multiple inline replies, empty-editor switching, independent saves, navigation protection, mobile and fallback drafts passed.',
  );
  const parentThread = threads.locator('[data-comment-thread]').first();
  const parentId = await parentThread.getAttribute('data-comment-thread');
  await parentThread.getByRole('button', { name: 'Reply', exact: true }).click();
  await expect(commentForm).toContainText('Post reply');
  await expect(
    parentThread.getByRole('group', { name: 'Edit comment', exact: true }),
  ).toBeVisible();
  const inlineFormBounds = await commentForm.boundingBox();
  const inlinePanelBounds = await commentForm.locator('..').boundingBox();
  const repliedToBounds = await parentThread.locator('[data-comment-id]').first().boundingBox();
  expect(inlineFormBounds!.y).toBeGreaterThan(repliedToBounds!.y);
  expect(inlinePanelBounds!.y - repliedToBounds!.y - repliedToBounds!.height).toBeLessThan(10);
  await parentThread.screenshot({ path: `${screenshots}/inline-reply-desktop.png` });
  await commentForm.locator('[contenteditable=true]').first().fill('A compact nested reply.');
  await parentThread.screenshot({ path: `${screenshots}/inline-reply-loaded-desktop.png` });
  await commentForm.getByRole('button', { name: 'Post reply', exact: true }).click();
  await expect(
    parentThread.getByRole('region', { name: 'Comment replies', exact: true }),
  ).toContainText('A compact nested reply.');
  await readerPage.reload();
  const reloadedThread = threads.locator(`[data-comment-thread="${parentId}"]`);
  await expect(reloadedThread.getByRole('button', { name: /^View thread/ })).toHaveCount(0);
  await expect(
    reloadedThread.getByRole('button', { name: 'Hide replies', exact: true }),
  ).toHaveCount(0);
  await expect(reloadedThread).toContainText('A compact nested reply.');
  let replyRefreshRequests = 0;
  const recordReplyRefresh = (request: Request) => {
    const url = new URL(request.url());
    if (
      request.method() === 'GET' &&
      url.pathname.endsWith('/comments') &&
      url.searchParams.get('parentId') === parentId
    )
      replyRefreshRequests++;
  };
  readerPage.on('request', recordReplyRefresh);
  const secondReply = (
    await (
      await page.request.post(unlistedCommentsUrl, {
        data: {
          parentId,
          content: makeDocument('A second reply makes this a collapsible thread.'),
        },
      })
    ).json()
  ).data;
  expect(secondReply.parentId).toBe(parentId);
  await readerPage.evaluate(async discussionId => {
    const { queryClient } = await import('/src/queryClient.ts');
    const { discussionKeys } = await import('/src/api/discussions/queryKeys.ts');
    await queryClient.invalidateQueries({ queryKey: discussionKeys.discussion(discussionId) });
  }, secondReply.discussionId);
  await expect(
    reloadedThread.getByRole('button', { name: 'Hide replies', exact: true }),
  ).toBeVisible();
  await expect(reloadedThread).toContainText('A compact nested reply.');
  await expect(reloadedThread).toContainText('A second reply makes this a collapsible thread.');
  // Let the root-count effect settle after the reply data arrives.
  await readerPage.waitForTimeout(100);
  expect(replyRefreshRequests).toBe(1);
  readerPage.off('request', recordReplyRefresh);
  await readerPage.reload();
  const threadToggle = reloadedThread.getByRole('button', {
    name: 'View thread (2 replies)',
    exact: true,
  });
  await expect(threadToggle).toBeVisible();
  await expect(reloadedThread.getByText('A compact nested reply.', { exact: true })).toHaveCount(0);
  const toggleBounds = await threadToggle.boundingBox();
  const rootReplyBounds = await reloadedThread
    .getByRole('button', { name: 'Reply', exact: true })
    .boundingBox();
  expect(toggleBounds!.x).toBeLessThan(rootReplyBounds!.x);
  expect(Math.abs(toggleBounds!.y - rootReplyBounds!.y)).toBeLessThan(2);
  await threadToggle.click();
  await expect(reloadedThread).toContainText('A compact nested reply.');
  await expect(reloadedThread).toContainText('A second reply makes this a collapsible thread.');
  // Explicit refresh updates open replies even after loading multiple root pages.
  await threads.getByRole('button', { name: 'Load more comments', exact: true }).click();
  await expect(threads.getByRole('button', { name: 'Load more comments' })).toHaveCount(0);
  const refreshedReplyText =
    'A second reply makes this a collapsible thread. Updated after root pagination.';
  expect(
    (
      await page.request.put(`${unlistedCommentsUrl}/${secondReply.id}`, {
        data: { content: makeDocument(refreshedReplyText), revision: secondReply.revision },
      })
    ).status(),
  ).toBe(200);
  await readerPage.evaluate(
    async ({ discussionId, viewerId }) => {
      const { queryClient } = await import('/src/queryClient.ts');
      const { discussionKeys } = await import('/src/api/discussions/queryKeys.ts');
      const rootKey = discussionKeys.comments(discussionId, viewerId);
      if (queryClient.getQueryData<{ pages: unknown[] }>(rootKey)?.pages.length !== 2)
        throw new Error('The root discussion must have two loaded pages.');
      await queryClient.invalidateQueries({
        queryKey: discussionKeys.discussion(discussionId),
      });
    },
    { discussionId: secondReply.discussionId, viewerId: readerId, parentId: parentId! },
  );
  await expect(reloadedThread).toContainText(refreshedReplyText);
  await reloadedThread.getByRole('button', { name: 'Hide replies', exact: true }).click();
  const thirdReply = (
    await (
      await page.request.post(unlistedCommentsUrl, {
        data: { parentId, content: makeDocument('A third reply arriving after pagination.') },
      })
    ).json()
  ).data;
  const refreshDiscussion = () =>
    readerPage.evaluate(
      async ({ discussionId }) => {
        const { queryClient } = await import('/src/queryClient.ts');
        const { discussionKeys } = await import('/src/api/discussions/queryKeys.ts');
        await queryClient.invalidateQueries({
          queryKey: discussionKeys.discussion(discussionId),
        });
      },
      { discussionId: secondReply.discussionId, viewerId: readerId },
    );
  await refreshDiscussion();
  await expect(
    reloadedThread.getByRole('button', { name: 'View thread (3 replies)', exact: true }),
  ).toBeVisible();
  expect((await page.request.delete(`${unlistedCommentsUrl}/${thirdReply.id}`)).status()).toBe(200);
  await refreshDiscussion();
  await reloadedThread
    .getByRole('button', { name: 'View thread (2 replies)', exact: true })
    .click();
  await expect(reloadedThread).toContainText(refreshedReplyText);
  const threadBounds = await reloadedThread.locator('[data-comment-id]').first().boundingBox();
  const replyBounds = await reloadedThread
    .getByRole('region', { name: 'Comment replies', exact: true })
    .boundingBox();
  expect(replyBounds!.y).toBeGreaterThan(threadBounds!.y);
  expect(replyBounds!.x).toBeGreaterThan(threadBounds!.x);
  expect((await page.request.delete(`${unlistedCommentsUrl}/${parentId}`)).status()).toBe(200);
  await readerPage.reload();
  await reloadedThread.getByRole('button', { name: 'View thread (2 replies)' }).click();
  await expect(reloadedThread).toContainText('Deleted comment');
  await expect(reloadedThread).toContainText('A compact nested reply.');
  await reloadedThread.getByRole('button', { name: 'Edit comment', exact: true }).click();
  await commentForm.locator('[contenteditable=true]').first().fill('Edited nested reply.');
  const nestedEditor = await commentForm.locator('[contenteditable=true]').first().elementHandle();
  await expect(
    reloadedThread.getByRole('button', { name: 'Hide replies', exact: true }),
  ).toBeDisabled();
  await expect(
    reloadedThread.getByRole('group', { name: 'Edit comment', exact: true }),
  ).toContainText('Edited nested reply.');
  expect(
    await commentForm
      .locator('[contenteditable=true]')
      .first()
      .evaluate((node, previous) => node === previous, nestedEditor),
  ).toBe(true);
  await commentForm.getByRole('button', { name: 'Save comment', exact: true }).click();
  await expect(reloadedThread).toContainText('Edited nested reply.');
  await readerPage.setViewportSize({ width: 390, height: 844 });
  await reloadedThread.scrollIntoViewIfNeeded();
  expect(
    await readerPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBe(true);
  await readerPage.screenshot({ path: `${screenshots}/mobile-replies.png`, fullPage: true });
  await reloadedThread.screenshot({ path: `${screenshots}/mobile-reply-thread.png` });
  console.log(
    'Compact comments, profile popovers, top alignment, replies and deleted parent preservation passed.',
  );

  const allRoots = (await (await readerPage.request.get(`${unlistedCommentsUrl}?limit=50`)).json())
    .data;
  const liveParent = allRoots.find(comment => !comment.deletedAt);
  const recoveryReply = (
    await (
      await readerPage.request.post(unlistedCommentsUrl, {
        data: {
          content: makeDocument('Reply to recover in its original thread.'),
          parentId: liveParent.id,
        },
      })
    ).json()
  ).data;
  await readerPage.goto(
    `${origin}/decks/${unlistedId}?deckTab=article&deckComment=${recoveryReply.id}`,
  );
  const recoveryCard = readerPage.locator(`[data-comment-id="${recoveryReply.id}"]`);
  await expect(recoveryCard).toBeInViewport();
  await recoveryCard.getByRole('button', { name: 'Edit comment' }).click();
  await commentForm
    .locator('[contenteditable=true]')
    .first()
    .fill('Recovered reply in the original thread.');
  const recoveryEditor = await commentForm
    .locator('[contenteditable=true]')
    .first()
    .elementHandle();
  expect((await page.request.delete(`${unlistedCommentsUrl}/${recoveryReply.id}`)).status()).toBe(
    200,
  );
  await readerPage.evaluate(async discussionId => {
    const { queryClient } = await import('/src/queryClient.ts');
    const { discussionKeys } = await import('/src/api/discussions/queryKeys.ts');
    await queryClient.invalidateQueries({ queryKey: discussionKeys.discussion(discussionId) });
  }, recoveryReply.discussionId);
  await expect(recoveryCard).toHaveCount(0);
  await expect(commentForm).toContainText('Recovered reply in the original thread.');
  expect(
    await commentForm
      .locator('[contenteditable=true]')
      .first()
      .evaluate((node, previous) => node === previous, recoveryEditor),
  ).toBe(true);
  await commentForm.getByRole('button', { name: 'Save comment', exact: true }).click();
  await expect(commentForm.getByRole('button', { name: 'Post as new comment' })).toBeVisible();
  await commentForm.getByRole('button', { name: 'Post as new comment' }).click();
  const originalThread = readerPage.locator(`[data-comment-thread="${liveParent.id}"]`);
  await expect(originalThread).toContainText('Recovered reply in the original thread.');
  await expect(originalThread).not.toContainText('Reply to recover in its original thread.');
  const savedReplies = (
    await (await readerPage.request.get(`${unlistedCommentsUrl}?parentId=${liveParent.id}`)).json()
  ).data;
  expect(
    savedReplies.some(
      comment =>
        JSON.stringify(comment.content).includes('Recovered reply in the original thread.') &&
        comment.parentId === liveParent.id,
    ),
  ).toBe(true);

  // A notification must reach a reply beyond both root and reply pagination.
  const oldParent = allRoots.find(comment =>
    JSON.stringify(comment.content).includes('Pagination comment 0'),
  );
  for (let index = 0; index < 24; index++)
    expect(
      (
        await page.request.post(unlistedCommentsUrl, {
          data: { content: makeDocument(`Older thread reply ${index}`), parentId: oldParent.id },
        })
      ).status(),
    ).toBe(201);
  const linkedReply = (
    await (
      await readerPage.request.post(unlistedCommentsUrl, {
        data: {
          content: makeDocument('Reply reached from its notification.'),
          parentId: oldParent.id,
        },
      })
    ).json()
  ).data;
  expect(
    (await (await page.request.get(`${unlistedCommentsUrl}?limit=20`)).json()).data.some(
      comment => comment.id === oldParent.id,
    ),
  ).toBe(false);
  expect(
    (
      await (
        await page.request.get(`${unlistedCommentsUrl}?parentId=${oldParent.id}&limit=20`)
      ).json()
    ).data.some(comment => comment.id === linkedReply.id),
  ).toBe(false);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${origin}/decks/${publicId}?deckTab=article&deckArticleEdit=true`);
  await expect(page.getByRole('group', { name: 'Edit guide', exact: true })).toBeVisible();
  await page.getByRole('button', { name: /^Notifications/ }).click();
  const inbox = page.getByRole('dialog', { name: 'Unread notifications', exact: true });
  const notificationLink = inbox
    .getByRole('link', { name: 'Article fixture unlisted', exact: true })
    .first();
  const notificationUrl = new URL((await notificationLink.getAttribute('href'))!, origin);
  expect(notificationUrl.searchParams.get('deckComment')).toBe(linkedReply.id);
  expect(notificationUrl.searchParams.has('deckArticleEdit')).toBe(false);
  await notificationLink.click();
  await expect(page).toHaveURL(new RegExp(`deckComment=${linkedReply.id}`));
  const linkedCard = page.locator(`[data-comment-id="${linkedReply.id}"]`);
  await expect(linkedCard).toContainText('Reply reached from its notification.');
  await expect(linkedCard).toBeInViewport();
  await expect(linkedCard).toBeFocused();
  await expect(page.getByRole('group', { name: 'Edit guide', exact: true })).toHaveCount(0);
  await page.screenshot({ path: `${screenshots}/notification-thread.png`, fullPage: true });
  console.log(
    'Reply recovery preserves its parent; notification links expand and focus replies across pagination.',
  );

  // Moving the scrollbar must take control away from automatic layout tracking.
  await expect(page.locator(`[data-comment-thread="${oldParent.id}"]`)).toContainText(
    'Older thread reply 19',
  );
  const scrollTopAfterResize = await linkedCard.evaluate(async element => {
    let scroller: HTMLElement | null = element.parentElement;
    while (
      scroller &&
      (scroller.scrollHeight <= scroller.clientHeight ||
        !['auto', 'scroll'].includes(getComputedStyle(scroller).overflowY))
    )
      scroller = scroller.parentElement;
    if (!scroller) throw new Error('Expected the discussion scroll container.');
    const initialTop = scroller.scrollTop;
    scroller.scrollTop = 0;
    await new Promise<void>(resolve =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
    const spacer = document.createElement('div');
    spacer.style.height = '500px';
    element.closest('section')!.appendChild(spacer);
    await new Promise<void>(resolve =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
    const top = scroller.scrollTop;
    spacer.remove();
    return { initialTop, top };
  });
  expect(scrollTopAfterResize.initialTop).toBeGreaterThan(0);
  expect(scrollTopAfterResize.top).toBe(0);
  const unlistedDiscussionId = (
    await sql`SELECT discussion_id FROM deck_discussion WHERE deck_id = ${unlistedId}`
  )[0]!.discussion_id;
  let releaseThread!: () => void;
  const pausedThread = new Promise<void>(resolve => {
    releaseThread = resolve;
  });
  const threadUrl = `**/api/discussions/${unlistedDiscussionId}/comments/${linkedReply.id}/thread`;
  await readerPage.route(threadUrl, async route => {
    await pausedThread;
    await route.continue();
  });
  await readerPage.goto(
    `${origin}/decks/${unlistedId}?deckTab=article&deckComment=${linkedReply.id}`,
  );
  await readerPage
    .getByRole('region', { name: 'Deck comments', exact: true })
    .getByRole('button', { name: 'Write a comment' })
    .click();
  const typingEditor = commentForm.locator('[contenteditable=true]').first();
  await typingEditor.focus();
  await readerPage.keyboard.type('Keep typing while the linked thread loads.');
  releaseThread();
  await expect(readerPage.locator(`[data-comment-id="${linkedReply.id}"]`)).toContainText(
    'Reply reached from its notification.',
  );
  await expect(typingEditor).toBeFocused();
  await readerPage.keyboard.type(' Still writing.');
  await expect(commentForm).toContainText(
    'Keep typing while the linked thread loads. Still writing.',
  );
  await readerPage.unroute(threadUrl);
  readerPage.once('dialog', dialog => dialog.accept());
  await commentForm.getByRole('button', { name: 'Cancel', exact: true }).click();
  console.log(
    'Linked comments respect manual scrolling and drafts started before thread loading completes.',
  );

  // The simple profile editor shares the persisted trailing-block cleanup.
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${origin}/users/${ownerId}`);
  await page.getByRole('button', { name: 'Add bio', exact: true }).click();
  const bioForm = page.getByRole('group', { name: 'Edit profile bio', exact: true });
  const bioEditor = bioForm.locator('[contenteditable=true]').first();
  await expect(bioEditor).toBeVisible();
  await expect(bioForm.locator('[data-editor-type=simple]')).toBeVisible();
  await bioEditor.fill('A player bio without trailing blank lines.');
  await page.keyboard.press('Control+End');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await bioForm.getByRole('button', { name: 'Save bio', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Profile bio', exact: true })).toContainText(
    'A player bio without trailing blank lines.',
  );
  expect(
    (await (await page.request.get(`${origin}/api/posts/profile/${ownerId}`)).json()).data.content
      .blocks,
  ).toHaveLength(1);
  console.log('Simple profile-bio trailing-block cleanup passed.');

  // An old bio can be converted and saved without typing into the editor.
  const currentBio = (
    await (await page.request.get(`${origin}/api/posts/profile/${ownerId}`)).json()
  ).data;
  const legacyBio = structuredClone(currentBio.content);
  legacyBio.blocks[0].content.push({
    type: 'swuInline',
    props: {
      data: JSON.stringify({ kind: 'mention', user: { id: readerId, displayName: 'Player' } }),
    },
  });
  legacyBio.blocks.push(emptyPostDocument().blocks[0], emptyPostDocument().blocks[0]);
  await sql`UPDATE post SET content = ${JSON.stringify(legacyBio)}::jsonb,
    revision = revision + 1, updated_at = now()
    WHERE id = ${currentBio.id} AND author_id = ${ownerId}`;
  await page.reload();
  await page.getByRole('button', { name: 'Edit bio', exact: true }).click();
  await expect(bioForm).toContainText('Existing widgets will be saved as ordinary text and links.');
  await bioForm.getByRole('button', { name: 'Save bio', exact: true }).click();
  await expect(bioForm).toHaveCount(0);
  const convertedBio = (
    await (await page.request.get(`${origin}/api/posts/profile/${ownerId}`)).json()
  ).data;
  expect(convertedBio.content.blocks).toHaveLength(1);
  expect(JSON.stringify(convertedBio.content)).not.toContain('swuInline');
  await page.getByRole('button', { name: 'Edit bio', exact: true }).click();
  await expect(bioForm.getByRole('button', { name: 'Save bio', exact: true })).toBeDisabled();
  await bioForm.getByRole('button', { name: 'Cancel', exact: true }).click();
  console.log('Legacy bio save without typing and legacy-comment recovery stay normalized.');

  const sanitizer = await Bun.file('scripts/remote-dev/sql/001-core-data.sql').text();
  const clear = sanitizer.match(/DO \$deck_discussion\$[\s\S]*?\$deck_discussion\$;/)?.[0];
  const assertions = sanitizer.slice(
    sanitizer.lastIndexOf("  IF to_regclass('public.deck_article')"),
    sanitizer.indexOf('  IF EXISTS (SELECT 1 FROM deck_folder)'),
  );
  expect(clear).toBeDefined();
  expect(assertions).toContain('Personal discussion comments remain');
  const rollback = new Error('Rollback sanitization check');
  try {
    await sql.begin(async tx => {
      await tx.unsafe(clear!);
      await tx.unsafe('UPDATE deck_information SET comments_count = 0;');
      await tx.unsafe(`DO $$ BEGIN ${assertions} END $$;`);
      expect((await tx`SELECT count(*)::int AS count FROM deck_article`)[0]!.count).toBe(0);
      expect((await tx`SELECT count(*)::int AS count FROM discussion_comment`)[0]!.count).toBe(0);
      throw rollback;
    });
  } catch (error) {
    if (error !== rollback) throw error;
  }
  expect((await page.request.get(articleUrl)).status()).toBe(200);
  expect(errors).toEqual([]);
  console.log(
    `Browser run ${publicId} passed at ${new Date().toISOString()}: guide/comments tabs, URL history, publishing/widgets, mentions/headings, posting/editing/deletion, draft recovery, visibility, root/reply pagination and refresh, notification focus, trimming in all editor types, sanitization, themes and mobile.`,
  );
} catch (error) {
  console.error('Failed page URLs:', {
    owner: page.url(),
    reader: readerPage.url(),
    visitor: visitor.url(),
  });
  await visitor.screenshot({ path: `${screenshots}/visitor-failure.png`, fullPage: true });
  await page.screenshot({ path: `${screenshots}/failure.png`, fullPage: true });
  console.error('Browser errors:', errors);
  console.error('Comment write statuses:', commentWrites);
  console.error(
    'Comment form errors:',
    await readerPage
      .getByRole('group', { name: 'Edit comment', exact: true })
      .getByRole('alert')
      .allTextContents(),
  );
  await readerPage.screenshot({ path: `${screenshots}/reader-failure.png`, fullPage: true });
  throw error;
} finally {
  await browser.close();
  await sql`DELETE FROM deck_folder WHERE id = ${folderId}`;
  await sql`DELETE FROM deck_information WHERE deck_id IN ${sql(deckIds)}`;
  await sql`DELETE FROM deck_card WHERE deck_id IN ${sql(deckIds)}`;
  await sql`DELETE FROM deck WHERE id IN ${sql(deckIds)}`;
  await sql`DELETE FROM session WHERE user_id IN ${sql([ownerId, readerId])}`;
  await sql`DELETE FROM "user" WHERE id IN ${sql([ownerId, readerId])}`;
  await sql.end();
}
