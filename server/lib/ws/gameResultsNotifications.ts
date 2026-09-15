import postgres from 'postgres';
import { z } from 'zod';
import { invalidateGameResultSockets } from './gameResultsRealtime.ts';

const scopeSchema = z.union([
  z.strictObject({ userId: z.string().min(1).max(128) }),
  z.strictObject({ teamId: z.uuid() }),
]);
let listening: Promise<unknown> | undefined;
/** Dedicated native LISTEN connection: worker/finalizer commits reach every API
 * replica. Notifications carry scope only; the authenticated API returns rows. */
export function startGameResultNotifications() {
  if (!listening) {
    const sql = postgres(process.env.DATABASE_URL!, {
      max: 1,
      connect_timeout: 5,
      idle_timeout: 20,
    });
    listening = sql
      .listen(
        'game_results',
        payload => {
          try {
            const parsed = scopeSchema.safeParse(JSON.parse(payload));
            if (parsed.success) invalidateGameResultSockets(parsed.data);
          } catch {
            /* Ignore malformed notifications. */
          }
        },
        () => invalidateGameResultSockets(),
      )
      .catch(async error => {
        listening = undefined;
        await sql.end({ timeout: 1 });
        throw error;
      });
  }
  return listening;
}
