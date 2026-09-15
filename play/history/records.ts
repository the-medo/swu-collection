import { compatibleVersions } from '../cards/catalog.ts';
import { isDeepStrictEqual } from 'node:util';
import { z } from 'zod';
import { advance } from '../engine/advance.ts';
import { decodeState, encodeState } from '../engine/checkpoint.ts';
import { inputSchema } from '../engine/model.ts';
import type { GameState } from '../engine/model.ts';
import { stateDigest } from '../storage/integrity.ts';
import type { JournalEntry, Recovery } from '../storage/postgres.ts';
import {
  cursorOf,
  initialCursor,
  restoreActionState,
  stepTimeline,
  undoTarget,
  undoTimeline,
} from './timeline.ts';
import type { HistoryCursor, Timeline } from './timeline.ts';

export const summarySchema = z.strictObject({
  result: z.strictObject({ winner: z.string().nullable(), reason: z.string().min(1).max(80) }),
  round: z.number().int().min(0),
});
export type GameSummary = z.infer<typeof summarySchema>;
export type HistoryEntry = JournalEntry & { timeline: Timeline };
export type History = Recovery & { summary: GameSummary | null };
export function historyFailure(): never {
  throw new Error('Crossfire history integrity mismatch');
}

/** Reconstruct one audited record. Undo restores a prior state but consumes a new
 * sequence/revision; following commands are never applied to the abandoned head. */
export function applyRecord(
  state: GameState,
  cursor: HistoryCursor,
  entry: JournalEntry,
  target: (sequence: number) => { state: GameState; cursor: HistoryCursor } | undefined,
): { state: GameState; timeline: Timeline } {
  if (entry.sequence !== cursor.sequence + 1 || entry.fromRevision !== state.revision)
    historyFailure();
  let next: GameState, timeline: Timeline;
  const facts: unknown[] = [];
  if (entry.control) {
    const control = entry.control;
    const saved = target(control.target);
    if (
      !saved ||
      entry.inputs.length ||
      entry.facts.length ||
      undoTarget(cursor, state, entry.actorId) !== control.target ||
      !state.seats.includes(control.approvedBy) ||
      control.approvedBy === entry.actorId ||
      stateDigest(encodeState(saved.state)) !== control.targetHash
    )
      historyFailure();
    next = restoreActionState(state, saved.state);
    if (next.nextId !== control.nextId || !isDeepStrictEqual(next.disclosure, control.disclosure))
      historyFailure();
    timeline = undoTimeline(cursor, saved.cursor);
  } else {
    if (!entry.inputs.length) historyFailure();
    const first = inputSchema.parse(entry.inputs[0]);
    if (first.type === 'random' || first.playerId !== entry.actorId) historyFailure();
    next = state;
    for (const [i, raw] of entry.inputs.entries()) {
      const input = inputSchema.parse(raw);
      if (i > 0 && input.type !== 'random') historyFailure();
      const result = advance(next, input);
      next = result.state;
      facts.push(...result.facts);
    }
    timeline = stepTimeline(cursor, state, next, first);
  }
  if (
    next.execution.random ||
    next.revision !== entry.revision ||
    stateDigest(encodeState(next)) !== entry.stateHash ||
    !isDeepStrictEqual(facts, entry.facts) ||
    (entry.timeline && !isDeepStrictEqual(timeline, entry.timeline))
  )
    historyFailure();
  return { state: next, timeline };
}

/** Full verification keeps only positions actually referenced by an undo. The
 * archive retains every branch, receipt and random input, including unused lines. */
export function verifyHistory(
  history: History,
  visit?: (before: GameState, after: GameState, entry: HistoryEntry) => void,
) {
  if (
    history.checkpoint.sequence !== 0 ||
    !compatibleVersions(history.versions) ||
    history.journal.length > 10_000 ||
    stateDigest(history.checkpoint.checkpoint) !== history.checkpoint.stateHash
  )
    historyFailure();
  let state = decodeState(history.checkpoint.checkpoint),
    cursor = initialCursor();
  if (
    state.gameId !== history.gameId ||
    state.revision !== history.checkpoint.revision ||
    !isDeepStrictEqual(state.versions, history.versions)
  )
    historyFailure();
  const wanted = new Set(history.journal.flatMap(e => (e.control ? [e.control.target] : [])));
  const saved = new Map<number, { state: GameState; cursor: HistoryCursor }>();
  let retainedBytes = 0;
  const retain = () => {
    if (!wanted.has(cursor.sequence)) return;
    retainedBytes += Buffer.byteLength(encodeState(state));
    if (retainedBytes > 128 * 1024 * 1024)
      throw new Error('Crossfire history reconstruction capacity');
    saved.set(cursor.sequence, { state, cursor });
  };
  retain();
  const entries: HistoryEntry[] = [];
  const receipts = new Set<string>();
  for (const entry of history.journal) {
    const key = JSON.stringify([entry.actorId, entry.commandId]);
    if (receipts.has(key)) historyFailure();
    receipts.add(key);
    const result = applyRecord(state, cursor, entry, sequence => saved.get(sequence));
    visit?.(state, result.state, { ...entry, timeline: result.timeline });
    state = result.state;
    cursor = cursorOf(result.timeline);
    entries.push({ ...entry, timeline: result.timeline });
    retain();
  }
  if (
    cursor.sequence !== history.sequence ||
    state.revision !== history.revision ||
    stateDigest(encodeState(state)) !== history.stateHash ||
    (history.summary &&
      !isDeepStrictEqual(history.summary, { result: state.result, round: state.round }))
  )
    historyFailure();
  return { state, cursor, history: { ...history, journal: entries } };
}

/** Seeking an already committed branch can restore directly from its parent.
 * Full audit verification also checks the abandoned head and undo eligibility;
 * the finalizer and live host own that check. This path verifies both state hashes. */
export function restoreRecord(
  saved: { state: GameState; cursor: HistoryCursor },
  entry: JournalEntry,
) {
  const control = entry.control;
  if (
    !control ||
    control.target !== saved.cursor.sequence ||
    entry.inputs.length ||
    entry.facts.length ||
    entry.revision !== entry.fromRevision + 1 ||
    entry.fromRevision <= saved.state.revision ||
    control.nextId < saved.state.nextId ||
    !saved.state.seats.includes(control.approvedBy) ||
    !saved.state.seats.includes(entry.actorId) ||
    control.approvedBy === entry.actorId ||
    saved.state.phase !== 'action' ||
    saved.state.execution.decision?.kind !== 'action' ||
    stateDigest(encodeState(saved.state)) !== control.targetHash
  )
    historyFailure();
  const state = decodeState(
    encodeState({
      ...saved.state,
      revision: entry.revision,
      nextId: control.nextId,
      disclosure: control.disclosure,
    }),
  );
  const timeline = undoTimeline({ ...saved.cursor, sequence: entry.sequence - 1 }, saved.cursor);
  if (
    stateDigest(encodeState(state)) !== entry.stateHash ||
    (entry.timeline && !isDeepStrictEqual(entry.timeline, timeline))
  )
    historyFailure();
  return { state, timeline };
}
