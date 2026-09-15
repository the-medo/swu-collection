// Operator recovery only. Normal delivery runs in the report submission handler.
import postgres from 'postgres';
import { parseArgs } from 'node:util';
import { z } from 'zod';
import { deliverCrossfireReports } from '../../server/lib/discord/crossfireReports.ts';

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: { 'dry-run': { type: 'boolean' }, 'report-id': { type: 'string' } },
});
const reportId =
  values['report-id'] === undefined ? undefined : z.uuid().parse(values['report-id']);
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const sql = postgres(process.env.DATABASE_URL, { max: 2, connect_timeout: 5 });
try {
  const result = await deliverCrossfireReports(sql, { dryRun: values['dry-run'], reportId });
  console.log(JSON.stringify(result));
  if (result.failed) process.exitCode = 1;
} catch {
  console.error('Crossfire report delivery failed. Check database and Discord configuration.');
  process.exitCode = 1;
} finally {
  await sql.end();
}
