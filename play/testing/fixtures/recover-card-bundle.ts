import postgres from 'postgres';
import { PostgresGameStore } from '../../storage/postgres.ts';
import { verifyHistory } from '../../history/records.ts';
import { encodeState } from '../../engine/checkpoint.ts';
import { stateDigest } from '../../storage/integrity.ts';
const sql = postgres(process.env.CROSSFIRE_TEST_DATABASE_URL!, { max: 2 });
try {
  const history = await new PostgresGameStore(sql).readHistory(process.argv[2]!);
  const state = verifyHistory(history).state;
  console.log(
    JSON.stringify({ hash: stateDigest(encodeState(state)), cards: state.versions.cards }),
  );
} finally {
  await sql.end();
}
