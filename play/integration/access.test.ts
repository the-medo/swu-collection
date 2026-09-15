import { afterAll, beforeAll, expect, test } from 'bun:test';
import { randomUUID } from 'node:crypto';
import postgres from 'postgres';
import { CrossfireAccess } from '../../server/lib/crossfire/access.ts';
const url = process.env.CROSSFIRE_TEST_DATABASE_URL;
if (!url || new URL(url).hostname !== '127.0.0.1' || !new URL(url).pathname.startsWith('/swubase_'))
  throw new Error('Select a local worktree database');
const sql = postgres(url, { max: 4, onnotice: () => {} });
const prefix = `access-test-${randomUUID()}`;
const admin = { userId: `${prefix}-admin`, sessionId: randomUUID() },
  target = { userId: `${prefix}-target`, sessionId: randomUUID() };
const service = new CrossfireAccess(sql);
beforeAll(async () => {
  for (const principal of [admin, target]) {
    await sql`INSERT INTO "user"(id,name,email,email_verified,created_at,updated_at,display_name,currency,role) VALUES(${principal.userId},${principal.userId},${principal.userId + '@invalid.local'},false,now(),now(),${principal.userId},'USD',${principal === admin ? 'admin' : 'moderator'})`;
    await sql`INSERT INTO session(id,token,expires_at,user_id,created_at,updated_at) VALUES(${principal.sessionId},${randomUUID()},now()+interval '1 hour',${principal.userId},now(),now())`;
  }
});
afterAll(async () => {
  await sql`DELETE FROM session WHERE user_id = ANY(${[admin.userId, target.userId]})`;
  await sql`DELETE FROM "user" WHERE id = ANY(${[admin.userId, target.userId]})`;
  await sql.end();
});
test('only a live role manager may list accounts or change Crossfire membership', async () => {
  for (const role of [
    null,
    'user',
    'crossfire',
    'moderator',
    'moderator,crossfire',
    'organizer,crossfire',
  ]) {
    await sql`UPDATE "user" SET role=${role} WHERE id=${target.userId}`;
    await expect(service.list(target, prefix)).rejects.toMatchObject({ status: 403 });
    await expect(service.set(target, target.userId, true)).rejects.toMatchObject({ status: 403 });
    expect((await sql`SELECT role FROM "user" WHERE id=${target.userId}`)[0]!.role).toBe(role);
  }
  await expect(
    service.set({ ...admin, sessionId: target.sessionId }, target.userId, true),
  ).rejects.toMatchObject({ status: 401 });
  await sql`UPDATE "user" SET banned=true WHERE id=${admin.userId}`;
  try {
    await expect(service.set(admin, target.userId, true)).rejects.toMatchObject({ status: 401 });
  } finally {
    await sql`UPDATE "user" SET banned=false WHERE id=${admin.userId}`;
  }
  await sql`UPDATE session SET expires_at=now()-interval '1 minute' WHERE id=${admin.sessionId}`;
  try {
    await expect(service.list(admin, prefix)).rejects.toMatchObject({ status: 401 });
  } finally {
    await sql`UPDATE session SET expires_at=now()+interval '1 hour' WHERE id=${admin.sessionId}`;
  }
});
test('admins can grant themselves access and preserve all other roles when updating accounts', async () => {
  expect((await service.set(admin, admin.userId, true)).roles).toEqual(['admin', 'crossfire']);
  expect((await service.set(admin, admin.userId, false)).roles).toEqual(['admin']);
  for (const role of [null, 'moderator', 'admin,organizer,future-role']) {
    await sql`UPDATE "user" SET role=${role} WHERE id=${target.userId}`;
    const expected = role?.split(',') ?? ['user'];
    expect((await service.set(admin, target.userId, true)).roles).toEqual([
      ...expected,
      'crossfire',
    ]);
    expect((await service.set(admin, target.userId, true)).roles).toEqual([
      ...expected,
      'crossfire',
    ]);
    expect((await service.set(admin, target.userId, false)).roles).toEqual(expected);
    expect((await sql`SELECT role FROM "user" WHERE id=${target.userId}`)[0]!.role).toBe(
      expected.join(','),
    );
  }
  await expect(service.set(admin, `${prefix}-missing`, true)).rejects.toMatchObject({
    status: 404,
  });
});
test('account search is bounded and treats wildcard input as literal text', async () => {
  const result = await service.list(admin, prefix);
  expect(result.users.map(u => u.id)).toEqual([admin.userId, target.userId]);
  expect(result.hasMore).toBe(false);
  expect(await service.list(admin, prefix + '%')).toEqual({ users: [], hasMore: false });
  expect(
    (await service.list(admin, `${target.userId}@invalid.local`)).users.map(u => u.id),
  ).toEqual([target.userId]);
});
test('a concurrent role update is retained by the membership toggle', async () => {
  const locked = Promise.withResolvers<void>(),
    release = Promise.withResolvers<void>();
  let blocker = 0;
  const otherUpdate = sql.begin(async tx => {
    blocker = Number((await tx`SELECT pg_backend_pid() AS pid`)[0]!.pid);
    await tx`UPDATE "user" SET role='organizer,moderator' WHERE id=${target.userId}`;
    locked.resolve();
    await release.promise;
  });
  await locked.promise;
  const grant = service.set(admin, target.userId, true);
  let waiting = false;
  try {
    for (let attempt = 0; attempt < 100; attempt++) {
      waiting = !!(
        await sql`SELECT 1 FROM pg_stat_activity WHERE ${blocker} = ANY(pg_blocking_pids(pid)) LIMIT 1`
      ).length;
      if (waiting) break;
      await Bun.sleep(10);
    }
    expect(waiting).toBe(true);
  } finally {
    release.resolve();
  }
  await otherUpdate;
  expect((await grant).roles).toEqual(['organizer', 'moderator', 'crossfire']);
});
