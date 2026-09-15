import { chatSendSchema } from './chat.ts';
import type { ChatMessage } from './chat.ts';
import { bookmarkMessageSchema } from './bookmarks.ts';
import type { Bookmark } from './bookmarks.ts';
import { undoMessageSchema } from './undo.ts';
import type { UndoPending } from './undo.ts';
import { z } from 'zod';
import type { ViewDelta } from './delta.ts';
import type { GameView } from './types.ts';
import { replaySeekSchema } from './replay.ts';
import type { ReplayPosition } from './replay.ts';

// The transport envelope evolves independently of the engine's view format.
export const WIRE_VERSION = 1 as const;
const handle = z.string().regex(/^[a-f0-9]{32}$/);
export const viewCommandSchema = z.strictObject({
  gameId: z.string().min(1).max(128),
  epoch: handle,
  expectedRevision: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  decisionId: handle,
  optionId: handle,
  selections: z.array(handle).max(512).default([]),
  namedCardId: z.string().min(1).max(120).optional(),
  chosenNumber: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).optional(),
});
export const clientMessageSchema = z.discriminatedUnion('type', [
  chatSendSchema,
  undoMessageSchema,
  bookmarkMessageSchema,
  z.strictObject({ type: z.literal('practice-accept'), id: z.uuid() }),
  z.strictObject({
    type: z.literal('authenticate'),
    wireVersion: z.literal(WIRE_VERSION),
    ticket: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
    showRevealedHands: z.boolean().default(true),
  }),
  z.strictObject({
    type: z.literal('command'),
    commandId: z.string().uuid(),
    command: viewCommandSchema,
  }),
  z.strictObject({
    type: z.literal('concede'),
    commandId: z.uuid(),
  }),
  z.strictObject({ type: z.literal('resync') }),
  z.strictObject({
    type: z.literal('replay-seek'),
    requestId: z.uuid(),
    seek: replaySeekSchema,
    perspective: z.enum(['own', 'public']).default('own'),
  }),
  z.strictObject({ type: z.literal('preferences'), showRevealedHands: z.boolean() }),
]);
export type ClientMessage = z.input<typeof clientMessageSchema>;
export type ServerMessage =
  | { type: 'chat'; gameId: string; replace: boolean; messages: ChatMessage[] }
  | { type: 'chat-error'; id: string; code: 'rate-limited' | 'chat-full' | 'conflict' }
  | { type: 'practice-created'; id: string; lobbyId: string }
  | { type: 'bookmark-saved'; bookmark: Bookmark }
  | { type: 'undo-state'; pending: UndoPending | null }
  | {
      type: 'replay';
      perspective: 'own' | 'public';
      wireVersion: 1;
      requestId: string | null;
      position: ReplayPosition;
      viewer: { role: 'player'; seat: string } | { role: 'spectator' };
      update: { type: 'snapshot'; view: GameView } | { type: 'delta'; delta: ViewDelta | null };
    }
  | { type: 'replay-live' }
  | {
      type: 'snapshot';
      wireVersion: 1;
      viewer: { role: 'player'; seat: string } | { role: 'spectator' };
      view: GameView;
    }
  | { type: 'delta'; wireVersion: 1; delta: ViewDelta }
  | { type: 'ack'; commandId: string; duplicate: boolean }
  | {
      type: 'error';
      code:
        | 'undo-pending'
        | 'invalid-command'
        | 'conflict'
        | 'busy'
        | 'resync-required'
        | 'unavailable';
      commandId?: string;
    };
