import type { WSContext } from 'hono/ws';
import { db } from '../../db';
import type { GameResult } from '../../db/schema/game_result.ts';
import { teamMember } from '../../db/schema/team_member.ts';
import { eq, inArray } from 'drizzle-orm';

type GameResultSocket = WSContext;
type SocketKey = object;

type SocketState = {
  userId: string;
  teamIds: string[];
  roomIds: Set<string>;
};

const roomSocketKeys = new Map<string, Set<SocketKey>>();
const socketStates = new Map<SocketKey, SocketState>();
const socketsByKey = new Map<SocketKey, GameResultSocket>();
let activeSocketCount = 0;

const userRoom = (userId: string) => `user:${userId}`;
const teamRoom = (teamId: string) => `team:${teamId}`;

const getSocketKey = (ws: GameResultSocket): SocketKey => {
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
  if (!socketKeys) {
    return;
  }

  socketKeys.delete(socketKey);
  if (socketKeys.size === 0) {
    roomSocketKeys.delete(roomId);
  }
};

const removeSocketEverywhere = (socketKey: SocketKey) => {
  const state = socketStates.get(socketKey);
  if (!state) {
    return false;
  }

  state.roomIds.forEach(roomId => removeSocketFromRoom(roomId, socketKey));
  socketStates.delete(socketKey);
  socketsByKey.delete(socketKey);
  activeSocketCount = Math.max(0, activeSocketCount - 1);
  return true;
};

const isSocketOpen = (ws: GameResultSocket) => {
  const raw = ws.raw as { readyState?: number } | undefined;
  const readyState = typeof raw?.readyState === 'number' ? raw.readyState : ws.readyState;
  return readyState === 1;
};

const shouldRemoveSocket = (ws: GameResultSocket) => {
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
    if (!room) {
      return;
    }

    room.forEach(socketKey => socketKeys.add(socketKey));
  });

  return socketKeys;
};

const mapTeamIdsByUserId = (memberships: { userId: string; teamId: string }[]) => {
  const byUser = new Map<string, Set<string>>();

  memberships.forEach(membership => {
    const teamIds = byUser.get(membership.userId);
    if (teamIds) {
      teamIds.add(membership.teamId);
      return;
    }

    byUser.set(membership.userId, new Set([membership.teamId]));
  });

  return byUser;
};

export const getUserTeamIdsForRealtime = async (userId: string) => {
  const rows = await db
    .select({ teamId: teamMember.teamId })
    .from(teamMember)
    .where(eq(teamMember.userId, userId));

  return rows.map(row => row.teamId);
};

export const registerGameResultSocket = (
  ws: GameResultSocket,
  params: {
    userId: string;
    teamIds: string[];
  },
) => {
  const socketKey = getSocketKey(ws);

  removeSocketEverywhere(socketKey);

  const roomIds = new Set<string>([userRoom(params.userId), ...params.teamIds.map(teamRoom)]);

  roomIds.forEach(roomId => addSocketToRoom(roomId, socketKey));
  socketsByKey.set(socketKey, ws);
  socketStates.set(socketKey, {
    userId: params.userId,
    teamIds: [...params.teamIds],
    roomIds,
  });

  activeSocketCount += 1;
};

export const unregisterGameResultSocket = (ws: GameResultSocket) => {
  removeSocketEverywhere(getSocketKey(ws));
};

export const hasActiveGameResultSockets = () => activeSocketCount > 0;

export const publishGameResultUpserts = async (results: GameResult[]) => {
  if (results.length === 0 || !hasActiveGameResultSockets()) {
    return;
  }

  const userIds = [...new Set(results.map(result => result.userId))];
  if (userIds.length === 0) {
    return;
  }

  const memberships = await db
    .select({
      userId: teamMember.userId,
      teamId: teamMember.teamId,
    })
    .from(teamMember)
    .where(inArray(teamMember.userId, userIds));

  const teamIdsByUserId = mapTeamIdsByUserId(memberships);

  results.forEach(result => {
    const teamIds = [...(teamIdsByUserId.get(result.userId) ?? new Set<string>())];
    const roomIds = [userRoom(result.userId), ...teamIds.map(teamRoom)];
    const socketKeys = collectSocketKeysForRooms(roomIds);

    if (socketKeys.size === 0) {
      return;
    }

    const payload = JSON.stringify({
      type: 'game_result.upserted',
      data: result,
      meta: {
        targetUserId: result.userId,
        teamIds,
      },
    });

    socketKeys.forEach(socketKey => {
      safeSend(socketKey, payload);
    });
  });
};
