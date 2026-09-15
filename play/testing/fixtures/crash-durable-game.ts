import postgres from 'postgres';
import { DurableGame } from '../../host/durable-game.ts';
import { PostgresGameStore } from '../../storage/postgres.ts';
const { lease, input, actor, command, crashAt } = await Bun.stdin.json();
const url = process.env.CROSSFIRE_TEST_DATABASE_URL;
if (!url) throw new Error('Missing test database');
const sql = postgres(url, { max: 1 });
const store = new PostgresGameStore(sql);
async function halt(stage: string): Promise<never> {
  console.log(stage);
  for (;;) await Bun.sleep(1000);
}
try {
  const host = await DurableGame.restore(
    {
      load: store.load.bind(store),
      renew: store.renew.bind(store),
      findReceipt: store.findReceipt.bind(store),
      append: async (...args: Parameters<typeof store.append>) => {
        if (crashAt === 'before-commit') await halt('before-commit');
        const receipt = await store.append(...args);
        await halt('after-commit-before-ack');
        return receipt;
      },
    },
    lease,
    { checkpointEvery: 2, leaseMs: 250 },
  );
  await host.submit(actor, command, input);
  throw new Error('Crash fixture unexpectedly acknowledged');
} finally {
  await sql.end();
}
