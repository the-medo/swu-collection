import type { CrossfireExits } from '../../server/lib/crossfire/exits.ts';
import type { ChatMessage } from '../view/chat.ts';
import { ChatError } from '../../server/lib/crossfire/chat.ts';
import type { CrossfireChat } from '../../server/lib/crossfire/chat.ts';
import type { CrossfirePractice } from '../../server/lib/crossfire/practice.ts';
import type { CrossfireBookmarks } from '../../server/lib/crossfire/bookmarks.ts';
import type { CrossfireUndo } from '../../server/lib/crossfire/undo.ts';
import type { ServerWebSocket } from 'bun';
import { z } from 'zod';
import { AdmissionError } from '../../server/lib/crossfire/lobbies.ts';
import { ConnectionError } from '../../server/lib/crossfire/connections.ts';
import type {
  ConnectionGrant,
  CrossfireConnections,
} from '../../server/lib/crossfire/connections.ts';
import {
  submitConnectedConcession,
  submitConnectedViewCommand,
} from '../../server/lib/crossfire/commands.ts';
import { IllegalInput } from '../engine/model.ts';
import type { GameState } from '../engine/model.ts';
import { Projector } from '../projection/projector.ts';
import { StorageError } from '../storage/postgres.ts';
import { diffViews } from '../view/delta.ts';
import { clientMessageSchema, WIRE_VERSION } from '../view/wire.ts';
import type { ServerMessage } from '../view/wire.ts';
import type { GameView } from '../view/types.ts';
import { GameWorker, WorkerError } from './games.ts';
import type { GameBinding } from './games.ts';
import { ReplayError } from '../history/cache.ts';
import type { ReplayService } from '../history/replay-service.ts';
import type { ReplayPosition, ReplaySeek } from '../view/replay.ts';

const optionsSchema = z.strictObject({
  origin: z.url(),
  hostname: z.string().min(1).default('127.0.0.1'),
  port: z.number().int().min(0).max(65535),
  maxConnections: z.number().int().min(2).max(4096).default(512),
  maxRoomConnections: z.number().int().min(2).max(256).default(64),
  authenticationMs: z.number().int().min(50).max(10_000).default(5000),
  maintenanceMs: z.number().int().min(50).max(5000).default(1000),
});
type Client = {
  gameId: string;
  origin: string | null;
  socket?: ServerWebSocket<Client>;
  closed: boolean;
  deadline?: ReturnType<typeof setTimeout>;
  grant?: ConnectionGrant;
  binding?: GameBinding;
  projector?: Projector;
  view?: GameView;
  stateRevision?: number;
  showRevealedHands: boolean;
  replay?: ReplayPosition;
  replayPerspective?: 'own' | 'public';
  replayPolicyKey?: string;
  latestSeek?: string;
  undoKey?: string;
  chatReady?: boolean;
  chatBuffer?: ChatMessage[];
  queued: number;
  tail: Promise<void>;
  tokens: number;
  refillAt: number;
};
const MAX_INCOMING_BYTES = 16 * 1024;
const MAX_BUFFERED_BYTES = 1024 * 1024;

/** Independent Bun listener. Identity comes from one-use API tickets; it does
 * not import the main HTTP app, accept raw engine input or broadcast full state. */
export function createGameServer(
  worker: GameWorker,
  connections: CrossfireConnections,
  rawOptions: z.input<typeof optionsSchema>,
  onFault: (operation: string) => void = operation =>
    console.error(`Crossfire ${operation} failed`),
  replays?: ReplayService,
  undo?: CrossfireUndo,
  bookmarks?: CrossfireBookmarks,
  practice?: CrossfirePractice,
  chat?: CrossfireChat,
  notifyReport?: (reportId: string) => Promise<void>,
  exits?: CrossfireExits,
) {
  const options = optionsSchema.parse(rawOptions);
  if (
    !['http:', 'https:'].includes(new URL(options.origin).protocol) ||
    new URL(options.origin).origin !== options.origin
  )
    throw new Error('Crossfire requires an exact HTTP(S) origin');
  const clients = new Set<Client>(),
    rooms = new Map<string, Set<Client>>();
  const pending = new Set<Promise<void>>();
  let open = true,
    maintaining: Promise<void> | undefined,
    stopping: Promise<void> | undefined;
  let nextPrune = 0;

  function remove(client: Client) {
    if (client.closed) return;
    client.closed = true;
    clearTimeout(client.deadline);
    // Keep a reservation for work already awaiting storage. Disconnecting
    // cannot open another slot while its authentication/commands still drain.
    if (!client.queued) clients.delete(client);
    const room = rooms.get(client.gameId);
    room?.delete(client);
    if (room?.size === 0) rooms.delete(client.gameId);
    client.binding?.release();
  }
  function close(client: Client, code: number) {
    remove(client);
    client.socket?.close(code);
  }
  function send(client: Client, message: ServerMessage): boolean {
    if (client.closed || !client.grant || !client.socket) return false;
    try {
      const json = JSON.stringify(message);
      if (Buffer.byteLength(json) + client.socket.getBufferedAmount() > MAX_BUFFERED_BYTES) {
        close(client, 4408);
        return false;
      }
      // -1 means queued by Bun; 0 means dropped and requires a new snapshot.
      if (client.socket.send(json) === 0) {
        close(client, 4408);
        return false;
      }
      return true;
    } catch {
      close(client, 4408);
      return false;
    }
  }
  function failure(client: Client, error: unknown, commandId?: string) {
    if (client.closed) return;
    if (error instanceof AdmissionError || error instanceof ConnectionError) {
      const code =
        error.code === 'revoked'
          ? 4409
          : error.code === 'unauthenticated' || error.code === 'invalid-ticket'
            ? 4401
            : 4403;
      close(client, code);
    } else if (error instanceof StorageError && error.code === 'not-authorized') {
      close(client, 4403);
    } else if (
      error instanceof StorageError &&
      ['undo-pending', 'exit-pending', 'stale-state'].includes(error.code)
    ) {
      send(client, {
        type: 'error',
        code:
          error.code === 'exit-pending'
            ? 'unavailable'
            : error.code === 'undo-pending'
              ? 'undo-pending'
              : 'conflict',
        ...(commandId ? { commandId } : {}),
      });
    } else if (error instanceof WorkerError && error.code === 'capacity' && client.view) {
      send(client, { type: 'error', code: 'busy', ...(commandId ? { commandId } : {}) });
    } else if (error instanceof ReplayError) {
      send(client, { type: 'error', code: error.code === 'capacity' ? 'busy' : 'unavailable' });
    } else if (error instanceof IllegalInput) {
      send(client, { type: 'error', code: 'resync-required', ...(commandId ? { commandId } : {}) });
    } else if (error instanceof StorageError && error.code === 'command-conflict') {
      send(client, { type: 'error', code: 'conflict', ...(commandId ? { commandId } : {}) });
    } else {
      if (!(error instanceof WorkerError)) onFault('operation');
      close(client, 1013);
    }
  }
  async function authorized(client: Client) {
    if (client.closed) return false;
    if (!client.grant || (client.grant.purpose === 'live' && !client.binding?.available)) {
      close(client, 1013);
      return false;
    }
    await connections.revalidate(client.grant);
    return !client.closed;
  }
  function projector(client: Client) {
    const grant = client.grant!;
    return new Projector(
      client.gameId,
      grant.role === 'player'
        ? { role: 'player', playerId: grant.seat, showRevealedHands: client.showRevealedHands }
        : { role: 'spectator', showRevealedHands: client.showRevealedHands },
    );
  }
  async function publish(client: Client, state: GameState, snapshot = false) {
    try {
      if (!(await authorized(client))) return;
      if (snapshot) client.projector = projector(client);
      const view = client.projector!.project(state);
      if (snapshot || !client.view) {
        const grant = client.grant!;
        if (
          send(client, {
            type: 'snapshot',
            wireVersion: WIRE_VERSION,
            viewer:
              grant.role === 'player'
                ? { role: 'player', seat: grant.seat }
                : { role: 'spectator' },
            view,
          })
        )
          client.view = view;
      } else {
        const delta = diffViews(client.view, view);
        if (!delta || send(client, { type: 'delta', wireVersion: WIRE_VERSION, delta }))
          client.view = view;
      }
      if (client.view === view) client.stateRevision = state.revision;
    } catch (error) {
      failure(client, error);
    }
  }
  async function publishUndo(gameId: string, force = false) {
    if (!undo) return;
    const pending = await undo.pending(gameId),
      key = JSON.stringify(pending);
    for (const client of rooms.get(gameId) ?? []) {
      if (client.grant?.purpose !== 'live' || (!force && client.undoKey === key)) continue;
      if (await authorized(client)) {
        send(client, { type: 'undo-state', pending });
        client.undoKey = key;
      }
    }
  }
  async function replay(
    client: Client,
    seek: ReplaySeek,
    requestId: string | null,
    perspective: 'own' | 'public' = 'own',
    replace = false,
  ) {
    if (!replays || client.grant?.purpose !== 'replay') throw new ConnectionError('denied');
    if (!(await authorized(client))) return;
    const result = await replays.seek(client.gameId, seek, client.replay);
    const policy = await connections.replayPolicy(client.grant);
    if (client.closed || (requestId && client.latestSeek !== requestId)) return;
    const policyKey = JSON.stringify(policy);
    replace ||= client.replayPolicyKey !== policyKey;
    const state = result.state;
    state.disclosure.handsToPlayers &&= policy.handsToPlayers;
    state.disclosure.handsToSpectators &&= policy.handsToSpectators;
    if (
      !client.projector ||
      replace ||
      perspective !== client.replayPerspective ||
      client.replay?.branch !== result.meta.branch
    ) {
      client.projector =
        perspective === 'public'
          ? new Projector(client.gameId, { role: 'spectator', showRevealedHands: false })
          : projector(client);
      replace = true;
    }
    const view = client.projector.project(state);
    const delta = client.view && !replace ? diffViews(client.view, view) : null;
    // Big seeks may be smaller as a permitted replacement than as a delta.
    const update =
      !client.view ||
      replace ||
      (delta && JSON.stringify(delta).length > JSON.stringify(view).length)
        ? { type: 'snapshot' as const, view }
        : { type: 'delta' as const, delta };
    const viewer =
      client.grant.role === 'player' && perspective === 'own'
        ? { role: 'player' as const, seat: client.grant.seat }
        : { role: 'spectator' as const };
    if (
      send(client, {
        type: 'replay',
        perspective,
        wireVersion: WIRE_VERSION,
        requestId,
        position: result.meta,
        viewer,
        update,
      })
    ) {
      client.view = view;
      client.stateRevision = state.revision;
      client.replay = result.meta;
      client.replayPerspective = perspective;
      client.replayPolicyKey = policyKey;
    }
  }
  function joinRoom(client: Client) {
    const room = rooms.get(client.gameId) ?? new Set<Client>();
    const grant = client.grant!;
    const livePlayer = grant.purpose === 'live' && grant.role === 'player';
    if (livePlayer)
      for (const old of room)
        if (
          old.grant?.purpose === 'live' &&
          old.grant.role === 'player' &&
          old.grant.seat === grant.seat
        )
          close(old, 4409);
    const viewers = [...room].filter(
      member => member.grant?.purpose !== 'live' || member.grant?.role !== 'player',
    ).length;
    if (
      room.size >= options.maxRoomConnections ||
      (!livePlayer && viewers >= options.maxRoomConnections - 2)
    ) {
      close(client, 1013);
      return false;
    }
    rooms.set(client.gameId, room);
    room.add(client);
    clearTimeout(client.deadline);
    return true;
  }
  async function handle(client: Client, message: z.output<typeof clientMessageSchema>) {
    if (client.closed || !open) return;
    if (!client.grant) {
      if (message.type !== 'authenticate') {
        close(client, 4401);
        return;
      }
      const grant = await connections.redeem(message.ticket, client.gameId, client.origin);
      if (client.closed) return;
      client.grant = grant;
      client.showRevealedHands = message.showRevealedHands;
      if (grant.purpose === 'replay') {
        if (joinRoom(client)) await replay(client, { kind: 'start' }, null);
        return;
      }
      const binding = await worker.acquire(client.gameId);
      if (client.closed) {
        binding.release();
        return;
      }
      client.grant = grant;
      client.binding = binding;
      client.showRevealedHands = message.showRevealedHands;
      await binding.run(async host => {
        if (!(await authorized(client))) return;
        if (!joinRoom(client)) return;
        await publish(client, host.state, true);
        await publishUndo(client.gameId);
      });
      if (chat && grant.role === 'player' && (await authorized(client))) {
        const messages = await chat.list(grant);
        if (await authorized(client)) {
          send(client, { type: 'chat', gameId: client.gameId, replace: true, messages });
          if (client.chatBuffer?.length)
            send(client, {
              type: 'chat',
              gameId: client.gameId,
              replace: false,
              messages: client.chatBuffer,
            });
          client.chatBuffer = undefined;
          client.chatReady = true;
        }
      }
      return;
    }
    if (message.type === 'authenticate') {
      close(client, 4400);
      return;
    }
    if (message.type === 'chat-send') {
      if (!chat || !(await authorized(client))) throw new StorageError('not-authorized');
      try {
        const afterEvent = client.binding
          ? await client.binding.run(
              async host => host.state.facts.filter(f => f.audience === 'public').length,
            )
          : undefined;
        const entry = await chat.send(client.grant, message.id, message.text, afterEvent);
        await Promise.all(
          [...(rooms.get(client.gameId) ?? [])].map(async viewer => {
            if (
              viewer.grant?.role === 'player' &&
              viewer.grant.purpose === 'live' &&
              (await authorized(viewer))
            ) {
              if (viewer.chatReady)
                send(viewer, {
                  type: 'chat',
                  gameId: client.gameId,
                  replace: false,
                  messages: [entry],
                });
              else viewer.chatBuffer = [...(viewer.chatBuffer ?? []), entry].slice(-100);
            }
          }),
        );
      } catch (error) {
        if (error instanceof ChatError)
          send(client, { type: 'chat-error', id: message.id, code: error.code });
        else throw error;
      }
      return;
    }
    if (message.type === 'practice-accept') {
      if (
        !practice ||
        !replays ||
        client.grant.purpose !== 'replay' ||
        client.grant.role !== 'player'
      )
        throw new StorageError('not-authorized');
      const request = await practice.prepare(client.grant, message.id);
      let lobbyId = request.lobbyId;
      if (!request.accepted) {
        const candidate = await replays.practice(
          client.gameId,
          request.position,
          request.branch,
          request.gameId,
        );
        lobbyId = await practice.accept(
          client.grant,
          message.id,
          candidate.checkpoint,
          candidate.sourceHash,
        );
      }
      if (await authorized(client))
        send(client, { type: 'practice-created', id: message.id, lobbyId });
      return;
    }
    if (message.type === 'bookmark') {
      const save = async () => {
        if (!bookmarks || !replays || !(await authorized(client)))
          throw new StorageError('not-authorized');
        if (message.epoch !== client.view?.epoch || message.revision !== client.view?.revision)
          throw new StorageError('stale-state');
        const position =
          client.grant!.purpose === 'replay'
            ? await replays.seek(client.gameId, { kind: 'refresh' }, client.replay)
            : await replays.seek(client.gameId, { kind: 'end' });
        if (message.report !== undefined && position.state.revision !== client.stateRevision)
          throw new StorageError('stale-state');
        const bookmark = await bookmarks.create(
          client.grant!,
          message.id,
          message.label,
          position.meta,
          message.report,
          message.report === undefined
            ? undefined
            : {
                state: position.state,
                view: client.view!,
                seat:
                  client.grant!.role === 'player' && client.replayPerspective !== 'public'
                    ? client.grant!.seat
                    : undefined,
              },
        );
        if (await authorized(client)) send(client, { type: 'bookmark-saved', bookmark });
      };
      if (client.grant.purpose === 'live') await client.binding!.run(save);
      else await save();
      // The report is committed and acknowledged. Start delivery directly from
      // this request, outside the game queue so Discord cannot delay the opponent.
      if (message.report !== undefined && notifyReport) {
        try {
          await notifyReport(message.id);
        } catch {
          onFault('report-notification');
        }
      }
      return;
    }
    if (client.grant.purpose === 'replay') {
      if (message.type === 'command' || message.type === 'concede' || message.type === 'undo')
        throw new StorageError('not-authorized');
      if (message.type === 'replay-seek') {
        if (client.latestSeek === message.requestId)
          await replay(client, message.seek, message.requestId, message.perspective);
      } else {
        if (message.type === 'preferences') client.showRevealedHands = message.showRevealedHands;
        await replay(client, { kind: 'refresh' }, null, client.replayPerspective, true);
      }
      return;
    }
    if (message.type === 'replay-seek') throw new ConnectionError('denied');
    await client.binding!.run(async host => {
      if (!(await authorized(client))) return;
      if (message.type === 'undo') {
        const grant = client.grant!;
        if (!undo || !replays || grant.role !== 'player') throw new StorageError('not-authorized');
        if (message.action === 'request') {
          if (message.epoch !== client.view?.epoch || message.revision !== client.view?.revision)
            throw new StorageError('stale-state');
          await undo.request(
            grant,
            message.id,
            await replays.prepareUndo(client.gameId, grant.seat),
          );
        } else if (message.action === 'approve') {
          const request = await undo.get(grant, message.id);
          if (request.requester === grant.seat) throw new StorageError('not-authorized');
          if (request.status === 'pending') {
            const prepared = await replays.prepareUndo(client.gameId, request.requester);
            const committed = await host.restoreAction(
              prepared,
              request.requester,
              grant.seat,
              message.id,
              {
                check: async () => {
                  await connections.revalidate(grant);
                  return true;
                },
                commit: tx => undo.approve(tx, grant, message.id, prepared),
              },
            );
            replays.committed(client.gameId);
            await Promise.all(
              [...(rooms.get(client.gameId) ?? [])].map(viewer =>
                viewer.grant?.purpose === 'replay'
                  ? authorized(viewer).then(ok => {
                      if (ok) send(viewer, { type: 'replay-live' });
                    })
                  : publish(viewer, committed.state, true),
              ),
            );
          }
        } else await undo.dismiss(grant, message.id, message.action);
        await publishUndo(client.gameId, true);
      } else if (message.type === 'command' || message.type === 'concede') {
        const committed =
          message.type === 'concede'
            ? await submitConnectedConcession(host, connections, client.grant!, message.commandId)
            : await submitConnectedViewCommand(
                host,
                connections,
                client.grant!,
                client.projector!,
                message.commandId,
                message.command,
              );
        if (!committed.duplicate) replays?.committed(client.gameId);
        await Promise.all(
          [...(rooms.get(client.gameId) ?? [])].map(viewer =>
            viewer.grant?.purpose === 'replay'
              ? authorized(viewer).then(ok => {
                  if (ok && !committed.duplicate) send(viewer, { type: 'replay-live' });
                })
              : publish(viewer, committed.state),
          ),
        );

        if (await authorized(client))
          send(client, {
            type: 'ack',
            commandId: message.commandId,
            duplicate: committed.duplicate,
          });
      } else {
        if (message.type === 'preferences') client.showRevealedHands = message.showRevealedHands;
        await publish(client, host.state, true);
        await publishUndo(client.gameId, true);
      }
    });
  }
  function enqueue(client: Client, raw: string | Buffer) {
    if (client.closed || !open) return;
    const now = performance.now();
    client.tokens = Math.min(30, client.tokens + (now - client.refillAt) * 0.015);
    client.refillAt = now;
    if (client.queued >= 8 || client.tokens < 1) {
      close(client, 4408);
      return;
    }
    client.tokens--;
    if (typeof raw !== 'string' || Buffer.byteLength(raw) > MAX_INCOMING_BYTES) {
      close(client, 4400);
      return;
    }
    let message: z.output<typeof clientMessageSchema>;
    try {
      message = clientMessageSchema.parse(JSON.parse(raw));
    } catch {
      close(client, 4400);
      return;
    }
    if (message.type === 'replay-seek') client.latestSeek = message.requestId;
    client.queued++;
    const work = client.tail
      .then(() => handle(client, message))
      .catch(error =>
        failure(
          client,
          error,
          message.type === 'command' || message.type === 'concede' ? message.commandId : undefined,
        ),
      )
      .finally(() => {
        client.queued--;
        if (client.closed && !client.queued) clients.delete(client);
        pending.delete(work);
      });
    client.tail = work;
    pending.add(work);
  }

  const server = Bun.serve<Client>({
    hostname: options.hostname,
    port: options.port,
    fetch(request, server) {
      const url = new URL(request.url);
      if (url.pathname === '/health' && request.method === 'GET')
        return Response.json({ status: open ? 'ok' : 'stopping' }, { status: open ? 200 : 503 });
      const match = /^\/api\/ws\/crossfire\/([A-Za-z][A-Za-z0-9_-]{0,127})$/.exec(url.pathname);
      if (!match || request.method !== 'GET' || url.search)
        return new Response(null, { status: 404 });
      if (!open || clients.size >= options.maxConnections)
        return new Response(null, { status: 503 });
      const client: Client = {
        gameId: match[1]!,
        origin: request.headers.get('origin'),
        closed: false,
        showRevealedHands: true,
        queued: 0,
        tail: Promise.resolve(),
        tokens: 30,
        refillAt: performance.now(),
      };
      clients.add(client); // Reserve before upgrade/open, including unauthenticated sockets.
      if (server.upgrade(request, { data: client })) return;
      remove(client);
      return new Response(null, { status: 426 });
    },
    websocket: {
      maxPayloadLength: MAX_INCOMING_BYTES,
      backpressureLimit: MAX_BUFFERED_BYTES,
      closeOnBackpressureLimit: true,
      idleTimeout: 60,
      sendPings: true,
      open(socket) {
        const client = socket.data;
        client.socket = socket;
        if (!open || client.origin !== options.origin) {
          close(client, 4403);
          return;
        }
        client.deadline = setTimeout(() => close(client, 4401), options.authenticationMs);
      },
      message(socket, raw) {
        enqueue(socket.data, raw);
      },
      close(socket) {
        remove(socket.data);
      },
    },
  });
  async function committed(gameId: string) {
    replays?.committed(gameId);
    const viewers = [...(rooms.get(gameId) ?? [])];
    await Promise.all(
      viewers
        .filter(v => v.grant?.purpose === 'replay')
        .map(async viewer => {
          if (await authorized(viewer)) send(viewer, { type: 'replay-live' });
        }),
    );
    const live = viewers.filter(v => v.grant?.purpose === 'live');
    const binding = live.find(v => v.binding?.available)?.binding;
    if (binding)
      await binding.run(async host => {
        await Promise.all(live.map(viewer => publish(viewer, host.state)));
      });
  }
  function maintain(): Promise<void> {
    if (maintaining) return maintaining;
    if (!open) return Promise.resolve();
    maintaining = (async () => {
      await worker.maintain();
      const exited = (await exits?.process(worker, () => onFault('match exit'))) ?? [];
      for (const gameId of exited) {
        replays?.committed(gameId);
        const viewers = [...(rooms.get(gameId) ?? [])];
        await Promise.all(
          viewers
            .filter(v => v.grant?.purpose === 'replay')
            .map(viewer =>
              authorized(viewer).then(ok => {
                if (ok) send(viewer, { type: 'replay-live' });
              }),
            ),
        );
        const live = viewers.filter(v => v.grant?.purpose === 'live');
        const binding = live.find(v => v.binding?.available)?.binding;
        if (binding)
          await binding.run(async host => {
            await Promise.all(live.map(viewer => publish(viewer, host.state)));
          });
      }
      await Promise.all(
        [...clients]
          .filter(client => client.grant && !client.queued)
          .map(async client => {
            try {
              await authorized(client);
            } catch (error) {
              failure(client, error);
            }
          }),
      );
      if (undo) await Promise.all([...rooms.keys()].map(id => publishUndo(id)));
      if (Date.now() >= nextPrune) {
        nextPrune = Date.now() + 60_000;
        try {
          await connections.pruneExpired();
        } catch {
          onFault('ticket cleanup');
        }
      }
    })().finally(() => {
      maintaining = undefined;
    });
    return maintaining;
  }
  const timer = setInterval(() => {
    void maintain().catch(() => onFault('maintenance'));
  }, options.maintenanceMs);
  return {
    server,
    committed,
    get livePlayerGames() {
      return [
        ...new Set(
          [...clients]
            .filter(c => !c.closed && c.grant?.role === 'player' && c.grant.purpose === 'live')
            .map(c => c.gameId),
        ),
      ];
    },
    maintain,
    get connectionCount() {
      return clients.size;
    },
    get statistics() {
      let liveConnections = 0,
        replayConnections = 0;
      for (const client of clients) {
        if (client.grant?.purpose === 'live') liveConnections++;
        else if (client.grant?.purpose === 'replay') replayConnections++;
      }
      return {
        connections: clients.size,
        liveConnections,
        replayConnections,
        rooms: rooms.size,
      };
    },
    stop(): Promise<void> {
      if (stopping) return stopping;
      open = false;
      clearInterval(timer);
      for (const client of clients) close(client, 1012);
      stopping = (async () => {
        // Bun 1.3.14 can leave stop() pending after a server-initiated socket
        // close despite stopping the listener. Drain our tracked work/leases
        // explicitly; do not make database shutdown depend on its counter.
        void server.stop(true).catch(() => onFault('listener shutdown'));
        server.unref();
        await Promise.allSettled([
          ...pending,
          worker.stop(),
          ...(replays ? [replays.stop()] : []),
          ...(maintaining ? [maintaining] : []),
        ]);
      })();
      return stopping;
    },
  };
}
