import type { Sql } from 'postgres';
import type { AppSubscription } from '../../../shared/types/notifications.ts';

export type AppPrincipal = { userId: string; sessionId: string };
type Access = { role: string | null; allowed: boolean } | null;
type Pending = {
  principal: AppPrincipal;
  subscription?: AppSubscription;
  resolve: (access: Access) => void;
  reject: (error: unknown) => void;
};

/** Batch checks in the same turn without caching authorization decisions.
 * A broadcast costs one query per batch; revocations still apply on delivery.
 */
export class AppRealtimeAccess {
  private pending: Pending[] = [];
  private outstanding = 0;
  constructor(private readonly sql: Sql) {}

  check(principal: AppPrincipal, subscription?: AppSubscription): Promise<Access> {
    if (this.outstanding >= 5000) return Promise.reject(new Error('Authorization overloaded'));
    this.outstanding++;
    return new Promise((resolve, reject) => {
      this.pending.push({ principal, subscription, resolve, reject });
      if (this.pending.length === 1)
        queueMicrotask(() => {
          void this.flush();
        });
    });
  }
  private async flush() {
    const waiting = this.pending.splice(0);
    const batches: Pending[][] = [];
    while (waiting.length) batches.push(waiting.splice(0, 512));
    await Promise.all(
      batches.map(async batch => {
        try {
          const requests = batch.map(({ principal, subscription }, position) => ({
            position,
            user_id: principal.userId,
            session_id: principal.sessionId,
            team_id: subscription?.topic === 'game-results' ? (subscription.teamId ?? null) : null,
            weekend_id: subscription?.topic === 'live-tournaments' ? subscription.weekendId : null,
          }));
          const rows = await this.sql`SELECT r.position, u.role,
          ((r.team_id IS NULL OR EXISTS (SELECT 1 FROM public.team_member m WHERE m.user_id = u.id AND m.team_id = r.team_id))
          AND (r.weekend_id IS NULL OR EXISTS (SELECT 1 FROM public.tournament_weekend w WHERE w.id = r.weekend_id))) AS allowed
          FROM jsonb_to_recordset(${this.sql.json(requests)}::jsonb)
            AS r(position int, user_id text, session_id text, team_id uuid, weekend_id uuid)
          JOIN public.session s ON s.id = r.session_id AND s.user_id = r.user_id
          JOIN public."user" u ON u.id = s.user_id
          WHERE s.expires_at > clock_timestamp() AND u.banned IS DISTINCT FROM true`;
          const access = new Map(
            rows.map(row => [
              row.position as number,
              { role: row.role as string | null, allowed: row.allowed as boolean },
            ]),
          );
          batch.forEach((request, position) => request.resolve(access.get(position) ?? null));
        } catch (error) {
          for (const request of batch) request.reject(error);
        } finally {
          this.outstanding -= batch.length;
        }
      }),
    );
  }
}
