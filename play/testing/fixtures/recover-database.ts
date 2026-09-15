import postgres from 'postgres';
import { loadBundle } from '../../host/bundles.ts';
import { PostgresGameStore, stateDigest } from '../../storage/postgres.ts';
import { recoverGame } from '../../storage/recover.ts';
const { gameId, directory } = await Bun.stdin.json();
const url = process.env.CROSSFIRE_TEST_DATABASE_URL;
if (!url) throw new Error('Missing test database');
const sql = postgres(url, { max: 1 });
try {
  const stored = await new PostgresGameStore(sql).load(gameId);
  const runtime = await loadBundle(directory, stored.versions);
  console.log(stateDigest(runtime.encodeState(recoverGame(runtime, stored))));
} finally {
  await sql.end();
}
