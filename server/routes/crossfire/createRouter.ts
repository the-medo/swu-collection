import { hasCrossfireAccess } from '../../../shared/lib/auth/roles.ts';
import type { CrossfireExits } from '../../lib/crossfire/exits.ts';
import { DeckBrowserRequestError, type CrossfireDecks } from '../../lib/crossfire/decks.ts';
import { crossfireDeckBrowserQuery } from '../../../shared/types/crossfire-decks.ts';
import type { CrossfireMatches } from '../../lib/crossfire/matches.ts';
import { matchReadySchema } from '../../../shared/types/crossfire-matches.ts';
import type { CrossfirePractice } from '../../lib/crossfire/practice.ts';
import type { CrossfireBookmarks } from '../../lib/crossfire/bookmarks.ts';
import { bookmarkLabelSchema } from '../../../play/view/bookmarks.ts';
import { z } from 'zod';
import { Hono } from 'hono';
import type { Context } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { HTTPException } from 'hono/http-exception';
import type { AuthExtension } from '../../auth/auth.ts';
import { AdmissionError } from '../../lib/crossfire/lobbies.ts';
import type { CrossfireLobbies } from '../../lib/crossfire/lobbies.ts';
import { ConnectionError } from '../../lib/crossfire/connections.ts';
import type { CrossfireConnections } from '../../lib/crossfire/connections.ts';
import type { CrossfireHistory } from '../../lib/crossfire/history.ts';
import { HistoryRequestError } from '../../lib/crossfire/history.ts';
import {
  crossfireCreateBody,
  crossfireHistoryQuery,
  crossfireDeckParams,
  crossfireJoinBody,
  crossfireLobbyParams,
  crossfireTicketBody,
} from '../../../shared/types/crossfire.ts';

type Services = {
  exits: Pick<CrossfireExits, 'leave'>;
  decks: Pick<CrossfireDecks, 'list' | 'get'>;
  matches: Pick<CrossfireMatches, 'get' | 'ready'>;
  lobbies: Pick<
    CrossfireLobbies,
    'create' | 'get' | 'join' | 'cancel' | 'inspectDeck' | 'invitations' | 'teammates' | 'decline'
  >;
  connections: Pick<CrossfireConnections, 'issue'>;
  history: Pick<CrossfireHistory, 'list'>;
  bookmarks: Pick<
    CrossfireBookmarks,
    'list' | 'rename' | 'remove' | 'reports' | 'report' | 'resolveReport'
  >;
  practice: Pick<CrossfirePractice, 'request' | 'list' | 'decline'>;
};
const principal = (c: Context<AuthExtension>) => ({
  userId: c.get('user')!.id,
  sessionId: c.get('session')!.id,
});

/** Uses the parent's Better Auth middleware. Injectable services keep HTTP tests
 * independent of OAuth configuration; no development identity bypass exists. */
export function createCrossfireRouter(config: {
  enabled: boolean;
  origin: string | undefined;
  services: () => Services;
  canReviewReports?: (userId: string) => Promise<boolean>;
}) {
  if (
    config.enabled &&
    (!config.origin ||
      !/^https?:$/.test(new URL(config.origin).protocol) ||
      new URL(config.origin).origin !== config.origin)
  )
    throw new Error('Crossfire requires an exact configured HTTP(S) origin');
  const buckets = new Map<string, { until: number; used: number }>();
  let nextSweep = 0;
  return new Hono<AuthExtension>()
    .onError((error, c) => {
      if (error instanceof HistoryRequestError || error instanceof DeckBrowserRequestError)
        return c.json({ error: 'invalid-cursor' }, 400);
      if (error instanceof HTTPException && error.status === 400)
        return c.json({ error: 'invalid-request' }, 400);
      if (error instanceof AdmissionError) {
        const status =
          error.code === 'unauthenticated'
            ? 401
            : error.code === 'forbidden'
              ? 403
              : ['unavailable', 'deck-unavailable'].includes(error.code)
                ? 404
                : error.code === 'unsupported-deck'
                  ? 422
                  : 409;
        return c.json({ error: error.code }, status);
      }
      if (error instanceof ConnectionError)
        return c.json({ error: error.code }, error.code === 'incompatible' ? 409 : 403);
      throw error;
    })
    .use('*', async (c, next) => {
      c.header('Cache-Control', 'no-store');
      if (!config.enabled) return c.json({ error: 'crossfire-unavailable' }, 503);
      if (!c.get('user') || !c.get('session')) return c.json({ error: 'unauthenticated' }, 401);
      if (!hasCrossfireAccess(c.get('user')!.role)) return c.json({ error: 'forbidden' }, 403);
      if (c.req.method !== 'GET' && c.req.method !== 'HEAD') {
        if (c.req.header('Origin') !== config.origin) return c.json({ error: 'origin' }, 403);
        const now = Date.now();
        if (now >= nextSweep) {
          for (const [id, bucket] of buckets) if (bucket.until <= now) buckets.delete(id);
          nextSweep = now + 60_000;
        }
        const id = c.get('user')!.id;
        let bucket = buckets.get(id);
        if (bucket && bucket.until <= now) {
          buckets.delete(id);
          bucket = undefined;
        }
        if ((!bucket && buckets.size >= 10_000) || (bucket && bucket.used >= 60)) {
          c.header(
            'Retry-After',
            String(Math.max(1, Math.ceil(((bucket?.until ?? now + 60_000) - now) / 1000))),
          );
          return c.json({ error: 'rate-limited' }, 429);
        }
        if (bucket) bucket.used++;
        else buckets.set(id, { until: now + 60_000, used: 1 });
      }
      await next();
    })
    .use('*', async (c, next) => {
      // Bound streamed bodies before JSON validation. This also handles missing
      // or inaccurate Content-Length and keeps parser errors separate from 413.
      if (c.req.raw.body) {
        const reader = c.req.raw.body.getReader();
        const chunks: Uint8Array[] = [];
        // A sideboard submission can contain 120 canonical card IDs; small
        // invitation/ticket bodies keep their existing tighter bound.
        const maximum = /\/lobbies\/[0-9a-f-]{36}\/match$/i.test(c.req.path) ? 32768 : 8192;
        let size = 0;
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            size += value.byteLength;
            if (size > maximum) {
              await reader.cancel();
              return c.json({ error: 'request-too-large' }, 413);
            }
            chunks.push(value);
          }
        } finally {
          reader.releaseLock();
        }
        const bytes = new Uint8Array(size);
        let offset = 0;
        for (const chunk of chunks) {
          bytes.set(chunk, offset);
          offset += chunk.byteLength;
        }
        c.req.raw = new Request(c.req.raw, { body: bytes });
      }
      await next();
    })
    .post('/lobbies/:lobbyId/leave', zValidator('param', crossfireLobbyParams), async c =>
      c.json({
        data: await config.services().exits.leave(principal(c), c.req.valid('param').lobbyId),
      }),
    )
    .get('/lobbies/:lobbyId/match', zValidator('param', crossfireLobbyParams), async c =>
      c.json({
        data: await config.services().matches.get(principal(c), c.req.valid('param').lobbyId),
      }),
    )
    .post(
      '/lobbies/:lobbyId/match',
      zValidator('param', crossfireLobbyParams),
      zValidator('json', matchReadySchema),
      async c =>
        c.json({
          data: await config
            .services()
            .matches.ready(principal(c), c.req.valid('param').lobbyId, c.req.valid('json')),
        }),
    )
    .get('/reports', async c =>
      c.json({ data: await config.services().bookmarks.reports(principal(c)) }),
    )
    .get(
      '/reports/:reportId',
      zValidator('param', z.strictObject({ reportId: z.uuid() })),
      async c =>
        c.json({
          data: await config
            .services()
            .bookmarks.report(
              principal(c),
              c.req.valid('param').reportId,
              (await config.canReviewReports?.(c.get('user')!.id)) ?? false,
            ),
        }),
    )
    .patch(
      '/reports/:reportId',
      zValidator('param', z.strictObject({ reportId: z.uuid() })),
      async c => {
        await config
          .services()
          .bookmarks.resolveReport(principal(c), c.req.valid('param').reportId);
        return c.json({ success: true });
      },
    )
    .get('/practice', async c =>
      c.json({ data: await config.services().practice.list(principal(c)) }),
    )
    .post(
      '/bookmarks/:bookmarkId/practice',
      zValidator('param', z.strictObject({ bookmarkId: z.uuid() })),
      zValidator('json', z.strictObject({ requestId: z.uuid() })),
      async c => {
        await config
          .services()
          .practice.request(
            principal(c),
            c.req.valid('param').bookmarkId,
            c.req.valid('json').requestId,
          );
        return c.json({ success: true }, 201);
      },
    )
    .delete(
      '/practice/:requestId',
      zValidator('param', z.strictObject({ requestId: z.uuid() })),
      async c => {
        await config.services().practice.decline(principal(c), c.req.valid('param').requestId);
        return c.json({ success: true });
      },
    )
    .get('/bookmarks', async c =>
      c.json({ data: await config.services().bookmarks.list(principal(c)) }),
    )
    .patch(
      '/bookmarks/:bookmarkId',
      zValidator('param', z.strictObject({ bookmarkId: z.uuid() })),
      zValidator('json', z.strictObject({ label: bookmarkLabelSchema })),
      async c => {
        await config
          .services()
          .bookmarks.rename(
            principal(c),
            c.req.valid('param').bookmarkId,
            c.req.valid('json').label,
          );
        return c.json({ success: true });
      },
    )
    .delete(
      '/bookmarks/:bookmarkId',
      zValidator('param', z.strictObject({ bookmarkId: z.uuid() })),
      async c => {
        await config.services().bookmarks.remove(principal(c), c.req.valid('param').bookmarkId);
        return c.json({ success: true });
      },
    )
    .get('/history', zValidator('query', crossfireHistoryQuery), async c =>
      c.json(
        await config
          .services()
          .history.list(principal(c), c.req.valid('query').cursor, c.req.valid('query').status),
      ),
    )
    .get('/decks', zValidator('query', crossfireDeckBrowserQuery), async c =>
      c.json(await config.services().decks.list(principal(c), c.req.valid('query'))),
    )
    .get('/decks/:deckId', zValidator('param', crossfireDeckParams), async c =>
      c.json({
        data: await config.services().decks.get(principal(c), c.req.valid('param').deckId),
      }),
    )
    .get('/decks/:deckId/readiness', zValidator('param', crossfireDeckParams), async c =>
      c.json({
        data: await config
          .services()
          .lobbies.inspectDeck(principal(c), c.req.valid('param').deckId),
      }),
    )
    .get('/invitations', async c =>
      c.json({ data: await config.services().lobbies.invitations(principal(c)) }),
    )
    .get('/teammates', async c =>
      c.json({ data: await config.services().lobbies.teammates(principal(c)) }),
    )
    .delete('/invitations/:lobbyId', zValidator('param', crossfireLobbyParams), async c => {
      await config.services().lobbies.decline(principal(c), c.req.valid('param').lobbyId);
      return c.body(null, 204);
    })
    .post('/lobbies', zValidator('json', crossfireCreateBody), async c => {
      const { deckId, policy, bestOf, showLeader, recipientId } = c.req.valid('json');
      return c.json(
        {
          data: await config
            .services()
            .lobbies.create(principal(c), deckId, policy, bestOf, showLeader, recipientId),
        },
        201,
      );
    })
    .get('/lobbies/:lobbyId', zValidator('param', crossfireLobbyParams), async c => {
      const lobby = await config.services().lobbies.get(principal(c), c.req.valid('param').lobbyId);
      if (!lobby) return c.json({ error: 'unavailable' }, 404);
      return c.json({ data: lobby });
    })
    .post(
      '/lobbies/:lobbyId/join',
      zValidator('param', crossfireLobbyParams),
      zValidator('json', crossfireJoinBody),
      async c => {
        const { deckId, acceptedPolicy, acceptedBestOf } = c.req.valid('json');
        return c.json({
          data: await config
            .services()
            .lobbies.join(
              principal(c),
              c.req.valid('param').lobbyId,
              deckId,
              acceptedPolicy,
              acceptedBestOf,
            ),
        });
      },
    )
    .delete('/lobbies/:lobbyId', zValidator('param', crossfireLobbyParams), async c => {
      await config.services().lobbies.cancel(principal(c), c.req.valid('param').lobbyId);
      return c.body(null, 204);
    })
    .post(
      '/lobbies/:lobbyId/tickets',
      zValidator('param', crossfireLobbyParams),
      zValidator('json', crossfireTicketBody),
      async c => {
        return c.json(
          {
            data: await config
              .services()
              .connections.issue(
                principal(c),
                c.req.valid('param').lobbyId,
                c.req.valid('json').role,
                c.req.header('Origin'),
                c.req.valid('json').purpose,
              ),
          },
          201,
        );
      },
    );
}
