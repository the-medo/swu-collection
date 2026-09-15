import { z } from 'zod';
import { decodeState, encodeState } from '../engine/checkpoint.ts';
import type { EngineInput, GameState } from '../engine/model.ts';

const sequence = z.number().int().min(0).max(2_147_483_647);
const actionSchema = z.strictObject({
  id: sequence.positive(),
  start: sequence,
  actor: z.string().min(1).max(128),
  round: sequence,
  actionsTaken: sequence,
});
export type HistoryAction = z.infer<typeof actionSchema>;
export const cursorSchema = z.strictObject({
  version: z.literal(1),
  sequence,
  branch: sequence,
  openAction: actionSchema.nullable(),
  lastAction: actionSchema.nullable(),
});
export type HistoryCursor = z.infer<typeof cursorSchema>;
export const timelineSchema = cursorSchema.extend({
  parent: sequence,
  action: actionSchema.nullable(),
});
export type Timeline = z.infer<typeof timelineSchema>;
export const undoControlSchema = z.strictObject({
  version: z.literal(1),
  kind: z.literal('undo'),
  target: sequence,
  targetHash: z.string().regex(/^[a-f0-9]{64}$/),
  approvedBy: z.string().min(1).max(128),
  nextId: sequence,
  disclosure: z.strictObject({ handsToPlayers: z.boolean(), handsToSpectators: z.boolean() }),
});
export type UndoControl = z.infer<typeof undoControlSchema>;

export const initialCursor = (): HistoryCursor => ({
  version: 1,
  sequence: 0,
  branch: 0,
  openAction: null,
  lastAction: null,
});
export const cursorOf = (timeline: Timeline): HistoryCursor =>
  cursorSchema.parse({
    version: timeline.version,
    sequence: timeline.sequence,
    branch: timeline.branch,
    openAction: timeline.openAction,
    lastAction: timeline.lastAction,
  });

/** Metadata lives outside rules state and never appears in a public board view.
 * Payment prompts and nested plays remain in the originating root action, even
 * when another player owns a replacement/trigger decision. */
export function stepTimeline(
  cursor: HistoryCursor,
  before: GameState,
  after: GameState,
  input: EngineInput,
): Timeline {
  if (before.gameId !== after.gameId || after.revision <= before.revision)
    throw new Error('Invalid history transition');
  const next = cursor.sequence + 1;
  let action = cursor.openAction;
  if (input.type === 'decision' && before.execution.decision?.kind === 'action') {
    if (action) throw new Error('Root action overlaps unfinished history action');
    action = {
      id: next,
      start: cursor.sequence,
      actor: input.playerId,
      round: before.round,
      actionsTaken: before.phaseHistory.actionsTaken[input.playerId] ?? 0,
    };
  }
  const finished =
    action !== null &&
    (after.result !== null ||
      after.phase !== 'action' ||
      after.round !== action.round ||
      (after.phaseHistory.actionsTaken[action.actor] ?? 0) !== action.actionsTaken ||
      // A cancelled payment returns to the root prompt without taking an action.
      after.execution.decision?.kind === 'action');
  return timelineSchema.parse({
    ...cursor,
    sequence: next,
    parent: cursor.sequence,
    action,
    openAction: finished ? null : action,
    lastAction: finished ? action : cursor.lastAction,
  });
}

export function undoTarget(cursor: HistoryCursor, state: GameState, actor: string): number | null {
  if (state.result || state.phase !== 'action') return null;
  const action =
    cursor.openAction ?? (state.execution.decision?.kind === 'action' ? cursor.lastAction : null);
  return action?.actor === actor && action.round === state.round ? action.start : null;
}

/** Trusted restoration only; request approval and position ancestry are host
 * responsibilities. A restore is a new durable transition, never a decrement of
 * the head revision or ID allocator. Viewer epochs must be replaced afterwards. */
export function restoreActionState(current: GameState, target: GameState): GameState {
  if (
    current.gameId !== target.gameId ||
    current.result ||
    target.phase !== 'action' ||
    target.execution.decision?.kind !== 'action' ||
    target.revision >= current.revision ||
    JSON.stringify(current.seats) !== JSON.stringify(target.seats) ||
    JSON.stringify(current.versions) !== JSON.stringify(target.versions)
  )
    throw new Error('Invalid undo position');
  return decodeState(
    encodeState({
      ...target,
      revision: current.revision + 1,
      nextId: Math.max(current.nextId, target.nextId),
      disclosure: structuredClone(current.disclosure),
    }),
  );
}

export function undoTimeline(cursor: HistoryCursor, target: HistoryCursor): Timeline {
  if (target.sequence >= cursor.sequence || target.openAction)
    throw new Error('Invalid undo history target');
  const next = cursor.sequence + 1;
  return timelineSchema.parse({
    ...target,
    sequence: next,
    branch: next,
    parent: target.sequence,
    action: null,
  });
}
