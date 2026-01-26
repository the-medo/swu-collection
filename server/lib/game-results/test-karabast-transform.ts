import { db } from '../../db';
import { integrationGameData } from '../../db/schema/integration.ts';
import { eq } from 'drizzle-orm';
import { transformKarabastGameDataToGameResults } from './transformKarabastGameDataToGameResults.ts';
import { upsertGameResults } from './upsertGameResults.ts';

/**
 * Script to test the transformation of Karabast game data and upsert into DB.
 * Usage: bun run server/lib/game-results/test-karabast-transform.ts <integration_game_data_id> [--upsert]
 */
const testTransform = async () => {
  const id = process.argv[2];
  const shouldUpsert = process.argv.includes('--upsert');

  if (!id) {
    console.error('Please provide an IntegrationGameData ID (UUID) as a parameter.');
    process.exit(1);
  }

  console.log(`Fetching IntegrationGameData with ID: ${id}...`);

  try {
    const [record] = await db
      .select()
      .from(integrationGameData)
      .where(eq(integrationGameData.id, id));

    if (!record) {
      console.error(`No record found for ID: ${id}`);
      process.exit(1);
    }

    console.log('Record found. Transforming...');

    const results = transformKarabastGameDataToGameResults(record);

    console.log('Transformation results:');
    console.log(JSON.stringify(results, null, 2));

    if (shouldUpsert) {
      console.log('Upserting results to database...');
      await upsertGameResults(results);
      console.log('Upsert complete.');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error during test:', error);
    process.exit(1);
  }
};

testTransform();
