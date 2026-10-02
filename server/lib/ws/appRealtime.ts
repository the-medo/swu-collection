import { WSContext } from 'hono/ws';
import postgres, { type Sql } from 'postgres';
import { z } from 'zod';
import { hasCrossfireAccess } from '../../../shared/lib/auth/roles.ts';
import {
  appClientMessageSchema,
  userNotificationChannel,
  userNotificationSignalSchema,
  type AppSubscription,
} from '../../../shared/types/notifications.ts';
import { invitationChannel } from '../crossfire/invitationEvents.ts';
import { registerGameResultSocket, unregisterGameResultSocket } from './gameResultsRealtime.ts';
import {
  registerLiveTournamentSocket,
  unregisterLiveTournamentSocket,
} from './liveTournamentRealtime.ts';
import { startGameResultNotifications } from './gameResultsNotifications.ts';
import { getLiveTournamentHomeVersion } from '../live-tournaments/liveTournamentHomeCache.ts';

import { AppRealtimeAccess, type AppPrincipal } from './appRealtimeAccess.ts';

type Principal = AppPrincipal;
type Event = { type: string; [key: string]: unknown };
type Client = {
  ws: WSContext;
  bridge: WSContext;
  principal: Principal;
  subscriptions: Map<AppSubscription['topic'], AppSubscription>;
  closed: boolean;
  queued: number;
  tail: Promise<void>;
  seen: number;
  checked: number;
  tokens: number;
  refillAt: number;
  resyncPending: boolean;
};
const invitationSignal = z.object({
  kind: z.literal('game').optional(),
  lobbyId: z.uuid(),
  users: z.array(z.string()).max(2),
});
const MAX_BUFFERED = 256 * 1024;

/** One account connection; game state remains on the dedicated game worker. */
export class AppRealtime {
  private clients = new Map<object, Client>();
  private ready: Promise<void> | undefined;
  private listeners: { unlisten(): Promise<void> }[] = [];
  private timer: ReturnType<typeof setInterval> | undefined;
  private readonly access: AppRealtimeAccess;
  constructor(
    private readonly sql: Sql,
    private readonly crossfireEnabled = process.env.CROSSFIRE_ENABLED === '1',
  ) {
    this.access = new AppRealtimeAccess(sql);
  }

  authorize(principal: Principal) {
    return this.access.check(principal);
  }
  start() {
    if (!this.ready)
      this.ready = this.listen().catch(error => {
        this.ready = undefined;
        throw error;
      });
    return this.ready;
  }
  private async listen() {
    try {
      this.listeners.push(
        await this.sql.listen(
          userNotificationChannel,
          payload => {
            try {
              const event = userNotificationSignalSchema.parse(JSON.parse(payload));
              for (const client of this.clients.values())
                if (client.principal.userId === event.userId)
                  this.send(client, { v: 1, type: event.type });
            } catch {
              /* Ignore malformed inter-process signals. */
            }
          },
          () => this.resync(),
        ),
      );
      if (this.crossfireEnabled)
        this.listeners.push(
          await this.sql.listen(
            invitationChannel,
            payload => {
              try {
                const event = invitationSignal.parse(JSON.parse(payload));
                for (const client of this.clients.values())
                  if (event.users.includes(client.principal.userId))
                    this.send(client, {
                      v: 1,
                      type: event.kind === 'game' ? 'crossfire.game' : 'crossfire.invitation',
                      lobbyId: event.lobbyId,
                    });
              } catch {
                /* Ignore malformed inter-process signals. */
              }
            },
            () => this.resync(),
          ),
        );
    } catch (error) {
      await Promise.allSettled(this.listeners.splice(0).map(listener => listener.unlisten()));
      throw error;
    }
    this.timer = setInterval(() => {
      for (const client of this.clients.values()) {
        if (Date.now() - client.seen > 120_000) this.close(client, 4408, 'Heartbeat expired');
        else if (!client.queued && Date.now() - client.checked > 30_000)
          this.enqueue(client, async () => {
            await this.check(client);
          });
      }
    }, 15_000);
    this.timer.unref();
  }
  private resync() {
    for (const client of this.clients.values()) this.send(client, { v: 1, type: 'app.resync' });
  }
  register(ws: WSContext, principal: Principal) {
    if (
      this.clients.size >= 5000 ||
      [...this.clients.values()].filter(c => c.principal.userId === principal.userId).length >= 12
    ) {
      ws.close(4429, 'Too many connections');
      return;
    }
    const client: Client = {
      ws,
      principal,
      bridge: undefined!,
      subscriptions: new Map(),
      closed: false,
      queued: 0,
      tail: Promise.resolve(),
      seen: Date.now(),
      checked: Date.now(),
      tokens: 30,
      refillAt: Date.now(),
      resyncPending: false,
    };
    client.bridge = new WSContext({
      raw: ws.raw,
      readyState: 1,
      close: (code, reason) => this.close(client, code ?? 1000, reason ?? ''),
      send: raw => {
        if (typeof raw !== 'string') return;
        const event = JSON.parse(raw) as Event;
        const topic = event.type.startsWith('game_result') ? 'game-results' : 'live-tournaments';
        const subscription = client.subscriptions.get(topic);
        if (subscription) this.send(client, event, subscription);
      },
    });
    this.clients.set(ws.raw as object, client);
    this.send(client, { v: 1, type: 'app.connected' });
  }
  private enqueue(client: Client, operation: () => Promise<void>) {
    if (client.closed) return;
    if (client.queued >= 64) {
      this.close(client, 4408, 'Too many pending messages');
      return;
    }
    client.queued++;
    client.tail = client.tail
      .then(async () => {
        if (!client.closed) await operation();
      })
      .catch(() => {
        this.close(client, 1013, 'Temporarily unavailable');
      })
      .finally(() => {
        client.queued--;
        // Retain capacity until queued work drains, including disconnected clients.
        if (client.closed && !client.queued) this.clients.delete(client.ws.raw as object);
      });
  }
  private async check(client: Client, subscription?: AppSubscription) {
    const account = await this.access.check(client.principal, subscription);
    client.checked = Date.now();
    if (!account) this.close(client, 4401, 'Session expired');
    return client.closed ? null : account;
  }
  private write(client: Client, event: Event) {
    if (client.closed) return;
    const raw = client.ws.raw as {
      send(data: string): number;
      getBufferedAmount(): number;
      readyState: number;
    };
    const message = JSON.stringify(event);
    if (
      raw.readyState !== 1 ||
      Buffer.byteLength(message) + raw.getBufferedAmount() > MAX_BUFFERED ||
      raw.send(message) === 0
    )
      this.close(client, 4408, 'Connection overloaded');
  }
  private send(client: Client, event: Event, subscription?: AppSubscription) {
    if (client.closed || client.resyncPending) return;
    if (client.queued >= 16) {
      // Collapse a burst into one authoritative HTTP refresh. Never let a busy
      // publisher turn healthy clients into a reconnect/refetch storm.
      client.resyncPending = true;
      this.enqueue(client, async () => {
        if (await this.check(client)) this.write(client, { v: 1, type: 'app.resync' });
        client.resyncPending = false;
      });
      return;
    }
    this.enqueue(client, async () => {
      const account = await this.check(client, subscription);
      if (!account) return;
      if (
        event.type.startsWith('crossfire.') &&
        (!this.crossfireEnabled || !hasCrossfireAccess(account.role))
      )
        return;
      if (subscription) {
        const topic = subscription.topic;
        // A queued event must not cross a page/scope replacement.
        if (client.subscriptions.get(topic) !== subscription) return;
        if (!account.allowed) {
          this.unsubscribe(client, topic);
          this.write(client, { v: 1, type: 'subscription.denied', topic });
          return;
        }
        if (
          topic === 'live-tournaments' &&
          subscription.topic === 'live-tournaments' &&
          (event.data as { weekendId?: string } | undefined)?.weekendId !== subscription.weekendId
        )
          return;
      }
      this.write(client, event);
    });
  }
  message(ws: WSContext, raw: unknown) {
    const client = this.clients.get(ws.raw as object);
    if (!client || client.closed) return;
    const now = Date.now();
    client.tokens = Math.min(30, client.tokens + ((now - client.refillAt) / 1000) * 5);
    client.refillAt = now;
    if (client.tokens < 1) {
      this.close(client, 4408, 'Message rate exceeded');
      return;
    }
    client.tokens--;
    if (typeof raw !== 'string' || Buffer.byteLength(raw) > 4096) {
      this.close(client, 4400, 'Invalid message');
      return;
    }
    let parsed;
    try {
      parsed = appClientMessageSchema.safeParse(JSON.parse(raw));
    } catch {
      /* malformed JSON */
    }
    if (!parsed?.success) {
      this.close(client, 4400, 'Invalid message');
      return;
    }
    const message = parsed.data;
    client.seen = now;
    this.enqueue(client, async () => {
      const account = await this.check(
        client,
        message.type === 'subscribe' ? message.subscription : undefined,
      );
      if (!account) return;
      if (message.type === 'ping') {
        this.write(client, { v: 1, type: 'pong' });
        return;
      }
      const sub = message.subscription;
      if (message.type === 'unsubscribe') {
        if (JSON.stringify(client.subscriptions.get(sub.topic)) === JSON.stringify(sub))
          this.unsubscribe(client, sub.topic);
        return;
      }
      if (!account.allowed) {
        this.write(client, { v: 1, type: 'subscription.denied', topic: sub.topic });
        return;
      }
      if (sub.topic === 'game-results') await startGameResultNotifications();
      if (client.closed) return;
      this.unsubscribe(client, sub.topic);
      client.subscriptions.set(sub.topic, sub);
      if (sub.topic === 'game-results') {
        registerGameResultSocket(client.bridge, {
          userId: client.principal.userId,
          teamIds: sub.teamId ? [sub.teamId] : [],
        });
        this.write(client, {
          type: 'game_results.connected',
          data: { userId: client.principal.userId },
        });
      } else {
        registerLiveTournamentSocket(client.bridge, {
          userId: client.principal.userId,
          weekendId: sub.weekendId,
        });
        this.write(client, {
          type: 'live_weekend.connected',
          data: { weekendId: sub.weekendId, version: getLiveTournamentHomeVersion(sub.weekendId) },
        });
      }
    });
  }
  private unsubscribe(client: Client, topic: AppSubscription['topic']) {
    if (topic === 'game-results') unregisterGameResultSocket(client.bridge);
    else unregisterLiveTournamentSocket(client.bridge);
    client.subscriptions.delete(topic);
  }
  private close(client: Client, code: number, reason: string) {
    this.remove(client.ws);
    client.ws.close(code, reason);
  }
  remove(ws: WSContext) {
    const client = this.clients.get(ws.raw as object);
    if (!client || client.closed) return;
    client.closed = true;
    this.unsubscribe(client, 'game-results');
    this.unsubscribe(client, 'live-tournaments');
    if (!client.queued) this.clients.delete(ws.raw as object);
  }
  async stop() {
    if (this.timer) clearInterval(this.timer);
    for (const client of this.clients.values()) this.close(client, 1001, 'Server closing');
    await Promise.all([...this.clients.values()].map(client => client.tail));
    await Promise.all(this.listeners.splice(0).map(listener => listener.unlisten()));
    this.ready = undefined;
  }
}

let instance: AppRealtime | undefined;
export function getAppRealtime() {
  return (instance ??= new AppRealtime(
    postgres(process.env.DATABASE_URL!, { max: 4, connect_timeout: 5, idle_timeout: 20 }),
  ));
}
