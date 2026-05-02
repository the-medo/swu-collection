import type { WSContext } from 'hono/ws';
import type { LiveTournamentHomePatchEvent } from '../../../types/TournamentWeekend.ts';

type LiveTournamentSocket = WSContext;
type SocketKey = object;

type SocketState = {
  userId: string;
  weekendId: string;
  roomIds: Set<string>;
};

const roomSocketKeys = new Map<string, Set<SocketKey>>();
const socketStates = new Map<SocketKey, SocketState>();
const socketsByKey = new Map<SocketKey, LiveTournamentSocket>();
let activeSocketCount = 0;

const weekendRoom = (weekendId: string) => `live-weekend:${weekendId}`;
const userRoom = (userId: string) => `live-user:${userId}`;

const getSocketKey = (ws: LiveTournamentSocket): SocketKey => {
  if (ws.raw && typeof ws.raw === 'object') {
    return ws.raw as SocketKey;
  }

  return ws as unknown as SocketKey;
};

const addSocketToRoom = (roomId: string, socketKey: SocketKey) => {
  const socketKeys = roomSocketKeys.get(roomId);
  if (socketKeys) {
    socketKeys.add(socketKey);
    return;
  }

  roomSocketKeys.set(roomId, new Set([socketKey]));
};

const removeSocketFromRoom = (roomId: string, socketKey: SocketKey) => {
  const socketKeys = roomSocketKeys.get(roomId);
  if (!socketKeys) return;

  socketKeys.delete(socketKey);
  if (socketKeys.size === 0) {
    roomSocketKeys.delete(roomId);
  }
};

const removeSocketEverywhere = (socketKey: SocketKey) => {
  const state = socketStates.get(socketKey);
  if (!state) return false;

  state.roomIds.forEach(roomId => removeSocketFromRoom(roomId, socketKey));
  socketStates.delete(socketKey);
  socketsByKey.delete(socketKey);
  activeSocketCount = Math.max(0, activeSocketCount - 1);
  return true;
};

const isSocketOpen = (ws: LiveTournamentSocket) => {
  const raw = ws.raw as { readyState?: number } | undefined;
  const readyState = typeof raw?.readyState === 'number' ? raw.readyState : ws.readyState;
  return readyState === 1;
};

const shouldRemoveSocket = (ws: LiveTournamentSocket) => {
  const raw = ws.raw as { readyState?: number } | undefined;
  const readyState = typeof raw?.readyState === 'number' ? raw.readyState : ws.readyState;
  return readyState === 2 || readyState === 3;
};

const safeSend = (socketKey: SocketKey, payload: string) => {
  const ws = socketsByKey.get(socketKey);
  if (!ws) {
    removeSocketEverywhere(socketKey);
    return false;
  }

  if (!isSocketOpen(ws)) {
    if (shouldRemoveSocket(ws)) {
      removeSocketEverywhere(socketKey);
    }
    return false;
  }

  try {
    ws.send(payload);
    return true;
  } catch {
    removeSocketEverywhere(socketKey);
    return false;
  }
};

const collectSocketKeysForRooms = (roomIds: string[]) => {
  const socketKeys = new Set<SocketKey>();

  roomIds.forEach(roomId => {
    const room = roomSocketKeys.get(roomId);
    if (!room) return;

    room.forEach(socketKey => socketKeys.add(socketKey));
  });

  return socketKeys;
};

export const registerLiveTournamentSocket = (
  ws: LiveTournamentSocket,
  params: {
    userId: string;
    weekendId: string;
  },
) => {
  const socketKey = getSocketKey(ws);

  removeSocketEverywhere(socketKey);

  const roomIds = new Set<string>([weekendRoom(params.weekendId), userRoom(params.userId)]);

  roomIds.forEach(roomId => addSocketToRoom(roomId, socketKey));
  socketsByKey.set(socketKey, ws);
  socketStates.set(socketKey, {
    userId: params.userId,
    weekendId: params.weekendId,
    roomIds,
  });

  activeSocketCount += 1;
};

export const unregisterLiveTournamentSocket = (ws: LiveTournamentSocket) => {
  removeSocketEverywhere(getSocketKey(ws));
};

export const hasActiveLiveTournamentSockets = () => activeSocketCount > 0;

export const publishLiveTournamentHomePatchEvent = (
  event: LiveTournamentHomePatchEvent | null | undefined,
  options: {
    userId?: string;
  } = {},
) => {
  if (!event || !hasActiveLiveTournamentSockets()) {
    return 0;
  }

  const roomIds = options.userId ? [userRoom(options.userId)] : [weekendRoom(event.data.weekendId)];
  const socketKeys = collectSocketKeysForRooms(roomIds);

  if (socketKeys.size === 0) {
    return 0;
  }

  const payload = JSON.stringify(event);
  let sentCount = 0;

  socketKeys.forEach(socketKey => {
    if (safeSend(socketKey, payload)) {
      sentCount += 1;
    }
  });

  return sentCount;
};
