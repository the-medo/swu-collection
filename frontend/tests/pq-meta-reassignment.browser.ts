// PQ_REASSIGN_BROWSER_TEST=1 bun --env-file=.env --env-file=.env.worktree frontend/tests/pq-meta-reassignment.browser.ts
// Runs against an isolated worktree and removes its database fixtures afterward.
import { chromium, expect as baseExpect } from 'playwright/test';
import postgres from 'postgres';
import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { getCookies } from 'better-auth/cookies';
import { serializeSignedCookie } from 'better-call';

const database = new URL(process.env.DATABASE_URL!);
const origin = process.env.BETTER_AUTH_URL!;
if (
  process.env.PQ_REASSIGN_BROWSER_TEST !== '1' ||
  database.hostname !== '127.0.0.1' ||
  !database.pathname.startsWith('/swubase_')
)
  throw new Error('Enable this test only against an isolated worktree database.');
if (
  !['localhost', '127.0.0.1'].includes(new URL(origin).hostname) &&
  !new URL(origin).hostname.endsWith('.ts.net')
)
  throw new Error('Expected a development origin.');
const expect = baseExpect.configure({ timeout: 20000 });
const sql = postgres(database.toString(), { max: 2 });
const id = randomUUID();
const userId = `pq-browser-${id}`;
const token = randomUUID();
const tournamentIds = Array.from({ length: 4 }, () => randomUUID());
const groupId = randomUUID();
const metaIds: number[] = [];
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
const page = await context.newPage();
page.setDefaultTimeout(20000);
const errors: string[] = [];
page.on('pageerror', error => errors.push(error.message));
await page.addLocatorHandler(page.getByRole('button', { name: 'Dismiss', exact: true }), () =>
  page.getByRole('button', { name: 'Dismiss', exact: true }).press('Enter'),
);
const section = page.getByRole('region', { name: 'Reassign PQ metas' });
const output = '.swubase/pq-reassignment-browser';
await mkdir(output, { recursive: true });
try {
  await expect
    .poll(
      async () =>
        (
          await page.request.post(`${origin}/api/tournament/bulk/pq-reassign-metas/preview`, {
            data: {},
          })
        ).status(),
      { timeout: 20000 },
    )
    .toBe(401);
  await sql`INSERT INTO "user" (id,name,email,email_verified,created_at,updated_at,display_name,currency,role) VALUES (${userId},'PQ browser',${userId + '@invalid.local'},false,now(),now(),${userId},'USD','user')`;
  await sql`INSERT INTO session (id,token,expires_at,user_id,created_at,updated_at) VALUES (${randomUUID()},${token},now()+interval '1 hour',${userId},now(),now())`;
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
  expect(
    (
      await page.request.post(`${origin}/api/tournament/bulk/pq-reassign-metas/preview`, {
        data: {},
      })
    ).status(),
  ).toBe(403);
  await sql`UPDATE "user" SET role='admin' WHERE id=${userId}`;
  for (const [name, format] of [
    ['Before', 1],
    ['Icons Premier', 1],
    ['Icons Eternal', 6],
    ['Homeworlds Sealed', 3],
  ] as const) {
    const [row] =
      await sql`INSERT INTO meta (name,set,format,date,season) VALUES (${name + ' ' + id},'ic27',${format},'2095-11-26',999) RETURNING id`;
    metaIds.push(row!.id);
  }
  for (const [i, tid] of tournamentIds.entries()) {
    const format = i === 1 ? 6 : i === 2 ? 3 : 1;
    await sql`INSERT INTO tournament (id,user_id,type,location,continent,name,attendance,format,meta,days,date) VALUES (${tid},${userId},'pq','FR','Europe',${'Browser PQ ' + i},0,${format},${i === 2 ? metaIds[3]! : i === 1 ? null : metaIds[0]!},1,${i === 3 ? '2095-11-25' : '2095-11-26'})`;
  }
  await sql`INSERT INTO tournament_group (id,name,meta_id,position,visible) VALUES (${groupId},'PQ Week 4',${metaIds[0]!},40,false)`;
  await sql`INSERT INTO tournament_group_tournament (group_id,tournament_id,position) VALUES (${groupId},${tournamentIds[0]!},10)`;
  await page.goto(`${origin}/admin?page=pq-tools`, { waitUntil: 'domcontentloaded' });
  await expect(section).toBeVisible();
  await section.getByLabel('From date (inclusive)').fill('2095-11-26');
  await section.getByLabel('Premier target meta').click();
  await page.getByRole('option', { name: `Icons Premier ${id}`, exact: true }).click();
  await section.getByLabel('Eternal target meta').click();
  await page.getByRole('option', { name: `Icons Eternal ${id}`, exact: true }).click();
  await section.getByRole('button', { name: 'Preview changes', exact: true }).click();
  await expect(section.getByText('1 Sealed PQs remain unchanged.')).toBeVisible();
  await expect(
    section.getByRole('button', { name: 'Apply reassignment', exact: true }),
  ).toBeEnabled();
  await section.getByLabel('From date (inclusive)').fill('2095-11-27');
  await expect(
    section.getByRole('button', { name: 'Apply reassignment', exact: true }),
  ).toHaveCount(0);
  await section.getByRole('button', { name: 'Preview changes', exact: true }).click();
  await expect(section.getByText('No changes needed for these selections.')).toBeVisible();
  await expect(
    section.getByRole('button', { name: 'Apply reassignment', exact: true }),
  ).toBeDisabled();

  await section.getByLabel('From date (inclusive)').fill('2095-11-26');
  await section.getByRole('button', { name: 'Preview changes', exact: true }).click();
  await expect(
    section.getByRole('button', { name: 'Apply reassignment', exact: true }),
  ).toBeEnabled();
  await section.screenshot({ path: `${output}/desktop.png` });
  await section.getByRole('button', { name: 'Apply reassignment', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  expect((await sql`SELECT meta FROM tournament WHERE id=${tournamentIds[0]!}`)[0]!.meta).toBe(
    metaIds[0],
  );
  await sql`UPDATE tournament SET updated_at=now() WHERE id=${tournamentIds[0]!}`;
  await section.getByRole('button', { name: 'Apply reassignment', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm reassignment', exact: true }).click();
  await expect(section.getByRole('alert')).toContainText('Preview again');
  expect((await sql`SELECT meta FROM tournament WHERE id=${tournamentIds[0]!}`)[0]!.meta).toBe(
    metaIds[0],
  );

  await sql`INSERT INTO tournament_group_tournament (group_id,tournament_id) VALUES (${groupId},${tournamentIds[3]!})`;
  await section.getByRole('button', { name: 'Preview changes', exact: true }).click();
  await expect(section.getByRole('alert')).toContainText('Resolve these groups');
  await expect(
    section.getByRole('button', { name: 'Apply reassignment', exact: true }),
  ).toBeDisabled();
  await sql`DELETE FROM tournament_group_tournament WHERE group_id=${groupId} AND tournament_id=${tournamentIds[3]!}`;
  await section.getByRole('button', { name: 'Preview changes', exact: true }).click();
  await expect(
    section.getByRole('button', { name: 'Apply reassignment', exact: true }),
  ).toBeEnabled();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await section.screenshot({ path: `${output}/mobile-dark.png` });
  expect(await section.evaluate(el => el.getBoundingClientRect().right <= window.innerWidth)).toBe(
    true,
  );
  await section.getByRole('button', { name: 'Apply reassignment', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm reassignment', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(section.getByRole('status')).toContainText(
    'Updated 2 PQs, 1 PQ Week groups, and 0 live-weekend references.',
  );
  const ts = await sql`SELECT id,meta FROM tournament WHERE id IN ${sql(tournamentIds)}`;
  expect(ts.find(t => t.id === tournamentIds[0])!.meta).toBe(metaIds[1]);
  expect(ts.find(t => t.id === tournamentIds[1])!.meta).toBe(metaIds[2]);
  expect(ts.find(t => t.id === tournamentIds[2])!.meta).toBe(metaIds[3]);
  expect(ts.find(t => t.id === tournamentIds[3])!.meta).toBe(metaIds[0]);
  expect(
    (await sql`SELECT name,meta_id FROM tournament_group WHERE id=${groupId}`)[0],
  ).toMatchObject({ name: 'PQ Week 4', meta_id: metaIds[1] });
  await section.getByRole('button', { name: 'Preview changes', exact: true }).click();
  await expect(section.getByText('No changes needed for these selections.')).toBeVisible();
  expect(errors).toEqual([]);
  console.log(
    'PQ reassignment browser checks passed: auth, preview, changed inputs, no-op, confirmation, stale preview, mixed group, apply, sealed/history preservation, responsive layout.',
  );
} finally {
  await context.close();
  await browser.close();
  await sql`DELETE FROM tournament_group WHERE id=${groupId}`;
  await sql`DELETE FROM tournament WHERE id IN ${sql(tournamentIds)}`;
  if (metaIds.length) await sql`DELETE FROM meta WHERE id IN ${sql(metaIds)}`;
  await sql`DELETE FROM "user" WHERE id=${userId}`;
  await sql.end();
}
