import { chatMessageSchema } from './chat.ts';
import { bookmarkSchema } from './bookmarks.ts';
import { undoPendingSchema } from './undo.ts';
import { replayPositionSchema } from './replay.ts';
import { z } from 'zod';
import type { GameView } from './types.ts';
import { PROTOCOL_VERSION } from './version.ts';
import type { ServerMessage } from './wire.ts';

const id = z.string().min(1).max(128);
const handle = z.string().regex(/^[a-f0-9]{32}$/);
const integer = z.number().int().min(Number.MIN_SAFE_INTEGER).max(Number.MAX_SAFE_INTEGER);
const count = integer.nonnegative();
const reference = z.strictObject({
  side: z.enum(['front', 'back']).optional(),
  cardId: id,
  name: z.string().max(512),
  currentCardId: handle.nullable(),
});
const face = z.strictObject({
  cardId: id,
  side: z.enum(['front', 'back']),
  name: z.string().max(512),
  printedKind: z.enum(['unit', 'leader', 'base', 'upgrade', 'event', 'player-token']),
  kind: z.enum(['unit', 'leader', 'base', 'upgrade', 'event', 'player-token']),
  token: z.boolean(),
  traits: z.array(z.string().min(1)),
  leaderUnit: z.boolean(),
  sentinel: z.boolean().optional(),
  notes: z.array(z.string().min(1).max(512)).optional(),
  warnings: z.array(z.string().min(1).max(512)).optional(),
  power: integer.nullable(),
  hp: integer.nullable(),
});
const card = z.strictObject({
  id: handle,
  face: face.nullable(),
  owner: id,
  controller: id,
  zone: z.enum(['base', 'ground', 'space', 'hand', 'resources', 'discard', 'captured']),
  exhausted: z.boolean(),
  damage: count,
  deployedAs: z.enum(['unit', 'upgrade']).nullable(),
  capturedBy: handle.nullable(),
  attachedTo: handle.nullable(),
  abilityUses: z.record(id, count),
  limitedActions: z.array(
    z.strictObject({ id, max: count.positive(), used: count, deployment: z.boolean() }),
  ),
});
const event = z.strictObject({
  order: count.optional(),
  mode: z.string().min(1).max(128).optional(),
  namedCard: z.string().min(1).max(512).optional(),
  id: handle,
  type: id,
  actor: id.nullable(),
  amount: integer.nullable(),
  cards: z.array(reference),
});
const modules = z.strictObject({
  phase: z.enum(['setup', 'action', 'regroup', 'ended']),
  round: count,
  activePlayer: id,
  initiative: z.strictObject({ holder: id, claimed: z.boolean() }),
  result: z
    .strictObject({
      winner: id.nullable(),
      reason: z.enum(['base-defeat', 'concession', 'card-effect']),
    })
    .nullable(),
  players: z.array(z.strictObject({ id, deckCount: count, handCount: count })).length(2),
  privateDeckTop: z.strictObject({ id: handle, face }).nullable(),
  scheduled: z.array(
    z.strictObject({
      id: handle,
      kind: z.enum([
        'defeat-at-regroup',
        'bottom-at-regroup',
        'return-at-regroup',
        'rescue-at-regroup',
        'victory-at-regroup',
        'resources-at-action',
        'resources-at-regroup',
        'effects-at-action',
        'control-at-regroup',
        'control-on-departure',
      ]),
      round: count,
      source: reference,
      target: reference.nullable(),
      arena: z.enum(['ground', 'space']).optional(),
      amount: count.positive().optional(),
    }),
  ),
  decision: z
    .strictObject({
      id: handle,
      source: reference.nullable(),
      presentation: z
        .strictObject({ title: z.string().min(1).max(160), text: z.string().min(1).max(1000) })
        .optional(),
      resourcePlan: z
        .strictObject({ confirmed: z.boolean(), cards: z.array(handle).max(2) })
        .nullable()
        .optional(),
      effect: id.nullable(),
      kind: z.enum([
        'initiative',
        'mulligan',
        'resource',
        'action',
        'trigger-player',
        'trigger',
        'effect',
        'unique',
        'replacement',
        'search',
        'delayed-player',
        'delayed',
      ]),
      inspectedCards: z.array(z.strictObject({ id: handle, face })),
      options: z.array(
        z.strictObject({
          id: handle,
          kind: id,
          cards: z.array(handle),
          playerId: id.nullable(),
          piloting: id.nullable(),
          plot: z.strictObject({ cost: count, useOtherResources: z.boolean() }).optional(),
          exploit: z.strictObject({ maxUnits: count, costBeforeExploit: count }).nullable(),
          smuggle: z.strictObject({ cost: count, grantedBy: reference.nullable() }).nullable(),
          mode: id.nullable(),
          delayed: z.strictObject({ source: reference, target: reference.nullable() }).nullable(),
          tokenCardId: id.nullable(),
          takeMulligan: z.boolean().nullable(),
          action: z
            .strictObject({
              id,
              limit: z
                .union([
                  z.enum(['once-per-game', 'once-per-round']),
                  z.strictObject({ per: z.literal('game'), max: count.positive() }),
                ])
                .nullable(),
              grantedBy: reference.nullable(),
              deploymentAvailable: z.boolean(),
              deploymentOnly: z.boolean().optional(),
            })
            .nullable(),
          ability: z
            .strictObject({
              id,
              source: reference,
              grantedBy: reference.nullable(),
              timing: id.optional(),
              index: count.optional(),
            })
            .nullable(),
        }),
      ),
      selection: z
        .strictObject({
          cards: z.array(handle),
          min: count,
          max: count,
          allocation: z
            .strictObject({ limits: z.record(handle, count), quantum: count.positive().optional() })
            .optional(),
          disclose: z
            .strictObject({ required: z.array(id), icons: z.record(handle, z.array(id)) })
            .optional(),
          budget: z
            .strictObject({
              stat: z.enum(['power', 'cost', 'remaining-hp']).optional(),
              max: count,
              costs: z.record(handle, count),
            })
            .optional(),
        })
        .nullable(),
    })
    .nullable(),
});
const scope = { protocolVersion: z.literal(PROTOCOL_VERSION), gameId: id, epoch: handle };
export const gameViewSchema: z.ZodType<GameView> = modules.extend({
  ...scope,
  revision: count,
  cards: z.array(card),
  events: z.array(event),
});
const collection = <T extends z.ZodType>(item: T) =>
  z.strictObject({
    upsert: z.array(item),
    remove: z.array(handle),
    order: z.array(handle).optional(),
  });
const viewDeltaSchema = z.strictObject({
  ...scope,
  fromRevision: count,
  revision: count,
  modules: modules.partial().optional(),
  cards: collection(card).optional(),
  events: collection(event).optional(),
});
export const serverMessageSchema: z.ZodType<ServerMessage> = z.discriminatedUnion('type', [
  z.strictObject({
    type: z.literal('chat'),
    gameId: id,
    replace: z.boolean(),
    messages: z.array(chatMessageSchema).max(100),
  }),
  z.strictObject({
    type: z.literal('chat-error'),
    id: z.uuid(),
    code: z.enum(['rate-limited', 'chat-full', 'conflict']),
  }),
  z.strictObject({ type: z.literal('practice-created'), id: z.uuid(), lobbyId: z.uuid() }),
  z.strictObject({ type: z.literal('bookmark-saved'), bookmark: bookmarkSchema }),
  z.strictObject({ type: z.literal('undo-state'), pending: undoPendingSchema.nullable() }),
  z.strictObject({ type: z.literal('replay-live') }),
  z.strictObject({
    type: z.literal('replay'),
    perspective: z.enum(['own', 'public']),
    wireVersion: z.literal(1),
    requestId: z.uuid().nullable(),
    position: replayPositionSchema,
    viewer: z.discriminatedUnion('role', [
      z.strictObject({ role: z.literal('player'), seat: id }),
      z.strictObject({ role: z.literal('spectator') }),
    ]),
    update: z.discriminatedUnion('type', [
      z.strictObject({ type: z.literal('snapshot'), view: gameViewSchema }),
      z.strictObject({ type: z.literal('delta'), delta: viewDeltaSchema.nullable() }),
    ]),
  }),
  z.strictObject({
    type: z.literal('snapshot'),
    wireVersion: z.literal(1),
    view: gameViewSchema,
    viewer: z.discriminatedUnion('role', [
      z.strictObject({ role: z.literal('player'), seat: id }),
      z.strictObject({ role: z.literal('spectator') }),
    ]),
  }),
  z.strictObject({
    type: z.literal('delta'),
    wireVersion: z.literal(1),
    delta: viewDeltaSchema,
  }),
  z.strictObject({ type: z.literal('ack'), commandId: z.string().uuid(), duplicate: z.boolean() }),
  z.strictObject({
    type: z.literal('error'),
    code: z.enum([
      'undo-pending',
      'invalid-command',
      'conflict',
      'busy',
      'resync-required',
      'unavailable',
    ]),
    commandId: z.string().uuid().optional(),
  }),
]);
