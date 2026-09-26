import postgres from 'postgres';
import { configuredAiObjects } from '../releases/objects.ts';
import { exportTrainingGames } from './export.ts';
if (process.env.CROSSFIRE_AI_EXPORT_CHILD !== '1' || !process.env.DATABASE_URL)
  throw new Error('Private AI export entrypoint');
const objects = configuredAiObjects();
if (objects) {
  const sql = postgres(process.env.DATABASE_URL, { max: 2, idle_timeout: 5, connect_timeout: 5 });
  try {
    await exportTrainingGames(sql, objects);
  } finally {
    await sql.end({ timeout: 5 });
  }
}
