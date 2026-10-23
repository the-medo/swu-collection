import { expect, test } from 'bun:test';
import { createIndependentCardCatalog } from '../../server/lib/cards/cardListProvider.ts';

test('independent catalog coalesces reads, expires, isolates clients and retries failures', async () => {
  let calls = 0,
    time = 0,
    fail = false;
  const database = {
    select: () => ({
      from: () => ({
        orderBy: async () => {
          calls++;
          if (fail) throw new Error('fixture failure');
          return [];
        },
      }),
    }),
  } as unknown as Parameters<typeof createIndependentCardCatalog>[0];
  const catalog = createIndependentCardCatalog(database, 30, () => time);
  const [first, second] = await Promise.all([catalog(), catalog()]);
  expect(first).toBe(second);
  expect(await catalog()).toBe(first);
  expect(calls).toBe(1);
  time = 31;
  expect(await catalog()).not.toBe(first);
  expect(calls).toBe(2);
  await createIndependentCardCatalog(database)();
  expect(calls).toBe(3);
  time = 62;
  fail = true;
  await expect(catalog()).rejects.toThrow('fixture failure');
  fail = false;
  await catalog();
  expect(calls).toBe(5);
});
