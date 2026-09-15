import { randomUUID } from 'node:crypto';
import { advance } from '../engine/advance.ts';
import { encodeState } from '../engine/checkpoint.ts';
import type { EngineInput, GameState, Intent } from '../engine/model.ts';
import type { History } from '../history/records.ts';
import {
  cursorOf,
  initialCursor,
  restoreActionState,
  stepTimeline,
  undoTimeline,
} from '../history/timeline.ts';
import type { HistoryCursor } from '../history/timeline.ts';
import { stateDigest } from '../storage/postgres.ts';
import { choose, position } from './helpers.ts';
import { scenario } from './scenario.ts';

export function historyFixture(
  gameId = `history-${randomUUID()}`,
  initial = scenario(position(gameId)).state,
) {
  let state = initial,
    cursor = initialCursor();
  const positions = new Map<number, { state: GameState; cursor: HistoryCursor }>([
    [0, { state, cursor }],
  ]);
  const checkpoint = encodeState(initial);
  const history: History = {
    gameId,
    versions: initial.versions,
    sequence: 0,
    revision: initial.revision,
    stateHash: stateDigest(checkpoint),
    checkpoint: {
      sequence: 0,
      revision: initial.revision,
      stateHash: stateDigest(checkpoint),
      checkpoint,
    },
    journal: [],
    summary: null,
  };
  const save = () => {
    positions.set(cursor.sequence, { state, cursor });
    history.sequence = cursor.sequence;
    history.revision = state.revision;
    history.stateHash = stateDigest(encodeState(state));
    history.summary = state.result ? { result: state.result, round: state.round } : null;
  };
  const submit = (input: EngineInput) => {
    if (input.type === 'random') throw new Error('Fixture requires player input');
    const before = state;
    const first = advance(state, input);
    state = first.state;
    const inputs: EngineInput[] = [input],
      facts = [...first.facts];
    while (state.execution.random) {
      const random: EngineInput = {
        type: 'random',
        gameId,
        expectedRevision: state.revision,
        requestId: state.execution.random.id,
        values: state.execution.random.bounds.map(() => 0),
      };
      inputs.push(random);
      const result = advance(state, random);
      state = result.state;
      facts.push(...result.facts);
    }
    const timeline = stepTimeline(cursor, before, state, input);
    cursor = cursorOf(timeline);
    history.journal.push({
      sequence: cursor.sequence,
      revision: state.revision,
      requestHash: stateDigest(JSON.stringify(input)),
      actorId: input.playerId,
      commandId: `command-${cursor.sequence}`,
      fromRevision: before.revision,
      stateHash: stateDigest(encodeState(state)),
      inputs,
      facts,
      timeline,
    });
    save();
    return state;
  };
  return {
    get state() {
      return state;
    },
    history,
    positions,
    submit,
    choose(kind: Intent['kind'], selections: string[] = []) {
      return submit(choose(state, kind, selections));
    },
    undo(target: number, actor = 'alice', approver = 'bob') {
      const saved = positions.get(target)!;
      const previous = state;
      state = restoreActionState(previous, saved.state);
      const timeline = undoTimeline(cursor, saved.cursor);
      cursor = cursorOf(timeline);
      const control = {
        version: 1 as const,
        kind: 'undo' as const,
        target,
        targetHash: stateDigest(encodeState(saved.state)),
        approvedBy: approver,
        nextId: state.nextId,
        disclosure: state.disclosure,
      };
      history.journal.push({
        sequence: cursor.sequence,
        revision: state.revision,
        requestHash: stateDigest(JSON.stringify(control)),
        actorId: actor,
        commandId: `undo-${cursor.sequence}`,
        fromRevision: previous.revision,
        stateHash: stateDigest(encodeState(state)),
        inputs: [],
        facts: [],
        timeline,
        control,
      });
      save();
      return state;
    },
    finish() {
      return submit({
        type: 'concede',
        gameId,
        expectedRevision: state.revision,
        playerId: state.seats[1],
      });
    },
  };
}
