import { afterAll, expect, test } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { eq, inArray } from 'drizzle-orm';
import { db } from '../../db';
import { user } from '../../db/schema/auth-schema.ts';
import { meleeConnection, meleeVerification } from '../../db/schema/melee_connection.ts';
import { createMeleeConnectionService } from './connection.ts';

// Explicitly opt in against the isolated worktree database after migrations.
const databaseTest = test.skipIf(process.env.SWUBASE_MELEE_DB_TEST !== '1');
if (process.env.SWUBASE_MELEE_DB_TEST === '1') {
  const target = new URL(process.env.DATABASE_URL!);
  if (target.hostname !== '127.0.0.1' || !target.pathname.startsWith('/swubase_')) {
    throw new Error('Melee database tests require an isolated local worktree database.');
  }
}
const users: string[] = [];
async function createUser() {
  const id = `melee-test-${randomUUID()}`;
  await db.insert(user).values({
    id,
    name: 'Melee test',
    displayName: id,
    currency: 'USD',
    email: `${id}@example.invalid`,
    emailVerified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  users.push(id);
  return id;
}
afterAll(async () => {
  if (users.length) await db.delete(user).where(inArray(user.id, users));
});

databaseTest('persistent challenge, proof, uniqueness, disconnect and reconnect', async () => {
  const owner = await createUser();
  const other = await createUser();
  let currentTime = Date.now();
  let bio = '';
  const meleeUserId = randomUUID();
  const service = createMeleeConnectionService(
    db,
    async username => ({ meleeUserId, username, displayName: 'Display Name', bio }),
    () => new Date(currentTime),
  );
  expect(await service.status(owner)).toEqual({ connection: null, challenge: null });
  const pending = await service.start(owner, 'Example');
  expect(pending.challenge?.code).toMatch(/^SWUBASE-[a-f0-9]{48}$/);
  expect((await service.status(other)).challenge).toBeNull();
  expect((await service.status(owner)).challenge).toEqual(pending.challenge);
  await expect(service.verify(owner)).rejects.toThrow('not found');
  await expect(service.verify(owner)).rejects.toThrow('wait 10 seconds');
  currentTime += 11_000;
  bio = pending.challenge!.code;
  const connected = await service.verify(owner);
  expect(connected.connection?.displayName).toBe('Display Name');
  expect(connected.connection?.meleeUserId).toBe(meleeUserId);
  expect(connected.challenge).toBeNull();
  await expect(service.verify(owner)).rejects.toThrow('expired or was canceled');
  await expect(service.start(owner, 'Other')).rejects.toThrow('Disconnect');
  const otherPending = await service.start(other, 'RenamedUsername');
  bio = otherPending.challenge!.code;
  await expect(service.verify(other)).rejects.toThrow('already connected');
  expect((await service.status(other)).challenge).not.toBeNull();
  expect((await service.status(owner)).connection?.username).toBe('Example');
  await service.disconnect(owner);
  currentTime += 11_000;
  expect((await service.verify(other)).connection?.username).toBe('RenamedUsername');
  await db.delete(user).where(eq(user.id, other));
  expect(
    await db.select().from(meleeConnection).where(eq(meleeConnection.userId, other)),
  ).toHaveLength(0);
});

databaseTest(
  'expired and regenerated codes cannot link; cooldown limits concurrent verification',
  async () => {
    const owner = await createUser();
    let currentTime = Date.now();
    let bio = '';
    let calls = 0;
    const service = createMeleeConnectionService(
      db,
      async username => {
        calls++;
        return { meleeUserId: randomUUID(), username, displayName: 'Name', bio };
      },
      () => new Date(currentTime),
    );
    const first = await service.start(owner, 'Example');
    await expect(service.start(owner, 'Example')).rejects.toThrow('wait 10 seconds');
    currentTime += 11_000;
    const second = await service.start(owner, 'Example');
    expect(second.challenge!.code).not.toBe(first.challenge!.code);
    bio = first.challenge!.code;
    const results = await Promise.allSettled([service.verify(owner), service.verify(owner)]);
    expect(results.every(result => result.status === 'rejected')).toBe(true);
    expect(calls).toBe(1);
    currentTime += 31 * 60_000;
    bio = second.challenge!.code;
    await expect(service.verify(owner)).rejects.toThrow('expired');
    expect(calls).toBe(1);
    expect((await service.status(owner)).challenge).toBeNull();
  },
);

databaseTest(
  'disconnect or regeneration during a fetch prevents stale verification from linking',
  async () => {
    for (const action of ['disconnect', 'regenerate'] as const) {
      const owner = await createUser();
      let currentTime = Date.now();
      let finish!: () => void;
      let started!: () => void;
      const fetching = new Promise<void>(resolve => {
        started = resolve;
      });
      const pendingFetch = new Promise<void>(resolve => {
        finish = resolve;
      });
      let bio = '';
      const service = createMeleeConnectionService(
        db,
        async username => {
          started();
          await pendingFetch;
          return { meleeUserId: randomUUID(), username, displayName: 'Name', bio };
        },
        () => new Date(currentTime),
      );
      bio = (await service.start(owner, 'Example')).challenge!.code;
      const verification = service.verify(owner).catch(error => error);
      await fetching;
      if (action === 'disconnect') await service.disconnect(owner);
      else {
        currentTime += 11_000;
        await service.start(owner, 'Other');
      }
      finish();
      expect((await verification).message).toContain('expired or changed');
      expect((await service.status(owner)).connection).toBeNull();
    }
  },
);

databaseTest('concurrent users cannot claim the same Melee identity', async () => {
  const owners = await Promise.all([createUser(), createUser()]);
  const meleeUserId = randomUUID();
  const services = owners.map(() =>
    createMeleeConnectionService(db, async username => {
      const [challenge] = await db
        .select()
        .from(meleeVerification)
        .where(eq(meleeVerification.username, username));
      return { meleeUserId, username, displayName: 'Name', bio: challenge!.code };
    }),
  );
  await Promise.all(owners.map((owner, index) => services[index]!.start(owner, owner)));
  const results = await Promise.allSettled(
    owners.map((owner, index) => services[index]!.verify(owner)),
  );
  expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
  expect(results.filter(result => result.status === 'rejected')).toHaveLength(1);
  expect(
    await db.select().from(meleeConnection).where(eq(meleeConnection.meleeUserId, meleeUserId)),
  ).toHaveLength(1);
});

databaseTest('canceling a challenge preserves generation and fetch cooldowns', async () => {
  const owner = await createUser();
  let currentTime = Date.now();
  let calls = 0;
  const service = createMeleeConnectionService(
    db,
    async username => {
      calls++;
      return { meleeUserId: randomUUID(), username, displayName: 'Name', bio: '' };
    },
    () => new Date(currentTime),
  );
  await service.start(owner, 'Example');
  currentTime += 5_000;
  await expect(service.verify(owner)).rejects.toThrow('not found');
  await service.disconnect(owner);
  expect((await service.status(owner)).challenge).toBeNull();
  await expect(service.start(owner, 'Example')).rejects.toThrow('wait 10 seconds');
  currentTime += 6_000;
  await service.start(owner, 'Example');
  await expect(service.verify(owner)).rejects.toThrow('wait 10 seconds');
  expect(calls).toBe(1);
});
