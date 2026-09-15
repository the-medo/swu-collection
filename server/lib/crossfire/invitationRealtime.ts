import type { CrossfireInvitationEvent } from '../../../shared/types/crossfire.ts';
import type { WSContext } from 'hono/ws';
import type { Sql } from 'postgres';
import { z } from 'zod';
import { invitationChannel, notifyInvitation } from './invitationEvents.ts';
import { requireSession, AdmissionError, type Principal } from './lobbies.ts';

const notification = z.object({
  kind: z.enum(['game']).optional(),
  lobbyId: z.string().uuid(),
  users: z.array(z.string()).max(2),
});
/** API-instance fanout through PostgreSQL; game-worker sockets remain independent. */
export class CrossfireInvitationRealtime {
  private clients = new Map<object, { ws: WSContext; principal: Principal; seen: number }>();
  private ready: Promise<unknown> | undefined;
  private ticking = false;
  private timer: ReturnType<typeof setInterval> | undefined;
  constructor(private readonly sql: Sql) {}

  async start() {
    if (!this.ready) {
      this.ready = this.sql
        .listen(
          invitationChannel,
          payload => {
            let data: unknown;
            try {
              data = JSON.parse(payload);
            } catch {
              return;
            }
            const event = notification.safeParse(data);
            if (!event.success) return;
            for (const [key, client] of this.clients) {
              if (event.data.users.includes(client.principal.userId)) {
                void this.send(key, {
                  v: 1,
                  type: event.data.kind === 'game' ? 'crossfire.game' : 'crossfire.invitation',
                  lobbyId: event.data.lobbyId,
                });
              }
            }
          },
          () => {
            // LISTEN reconnects automatically. Refetch after gaps instead of assuming no events were lost.
            for (const key of this.clients.keys())
              void this.send(key, { v: 1, type: 'crossfire.connected' });
          },
        )
        .catch(error => {
          this.ready = undefined;
          throw error;
        });
    }
    await this.ready;
    if (!this.timer) {
      this.timer = setInterval(() => void this.tick(), 2000);
      this.timer.unref();
    }
  }
  async authorize(principal: Principal) {
    await this.sql.begin(async tx => {
      await requireSession(tx, principal);
    });
  }
  register(ws: WSContext, principal: Principal) {
    const key = ws.raw as object;
    if (
      this.clients.size >= 5000 ||
      [...this.clients.values()].filter(c => c.principal.userId === principal.userId).length >= 12
    ) {
      ws.close(4429, 'Too many connections');
      return;
    }
    this.clients.set(key, { ws, principal, seen: Date.now() });
    void this.send(key, { v: 1, type: 'crossfire.connected' });
  }
  /** Check the current account before sending, including after LISTEN reconnects. */
  private async send(key: object, event: CrossfireInvitationEvent) {
    const client = this.clients.get(key);
    if (!client) return;
    try {
      await this.authorize(client.principal);
      if (this.clients.get(key) === client) client.ws.send(JSON.stringify(event));
    } catch (error) {
      this.clients.delete(key);
      client.ws.close(
        error instanceof AdmissionError && error.code === 'forbidden' ? 4403 : 4401,
        'Access revoked',
      );
    }
  }
  remove(ws: WSContext) {
    this.clients.delete(ws.raw as object);
  }
  async ping(ws: WSContext) {
    const key = ws.raw as object;
    const client = this.clients.get(key);
    if (!client || Date.now() - client.seen < 5000) return;
    client.seen = Date.now();
    try {
      await this.authorize(client.principal);
      ws.send(JSON.stringify({ v: 1, type: 'pong' } satisfies CrossfireInvitationEvent));
    } catch (error) {
      this.clients.delete(key);
      ws.close(
        error instanceof AdmissionError && error.code === 'forbidden' ? 4403 : 4401,
        'Access revoked',
      );
    }
  }
  /** Indexed, bounded expiry sweep; admission independently checks the exact deadline. */
  async tick() {
    if (this.ticking) return;
    this.ticking = true;
    try {
      await this.sql.begin(async tx => {
        const rows = await tx`UPDATE play.lobbies SET status = 'expired' WHERE id IN (
          SELECT id FROM play.lobbies WHERE status = 'waiting' AND expires_at <= clock_timestamp()
          ORDER BY expires_at LIMIT 100 FOR UPDATE SKIP LOCKED) RETURNING id`;
        for (const row of rows) await notifyInvitation(tx, row.id);
      });
      for (const [key, client] of this.clients)
        if (Date.now() - client.seen > 45_000) {
          this.clients.delete(key);
          client.ws.close(4408, 'Heartbeat expired');
        }
    } catch {
      console.error('Crossfire invitation expiry sweep failed');
    } finally {
      this.ticking = false;
    }
  }
  async stop() {
    if (this.timer) clearInterval(this.timer);
    for (const client of this.clients.values()) client.ws.close(1001, 'Server closing');
    this.clients.clear();
    const listener = (await this.ready) as { unlisten: () => Promise<void> } | undefined;
    await listener?.unlisten();
    this.ready = undefined;
    this.timer = undefined;
  }
}
