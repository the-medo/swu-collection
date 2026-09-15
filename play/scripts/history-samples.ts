import { randomUUID } from 'node:crypto';
import targets from '../testing/fixtures/meta-targets.json';
import { advance, createGame } from '../engine/advance.ts';
import { encodeState } from '../engine/checkpoint.ts';
import type { EngineInput, GameState, Fact } from '../engine/model.ts';
import type { GameConfig } from '../engine/state.ts';
import { stateDigest } from '../storage/integrity.ts';
import { Projector } from '../projection/projector.ts';
import { disclosureComplete } from '../view/types.ts';
import type { GameView } from '../view/types.ts';
import type { History } from '../history/records.ts';
import { stepTimeline, cursorOf, initialCursor } from '../history/timeline.ts';
export type HistorySample = {
  history: History;
  checkpoints: History['checkpoint'][];
  actions: number;
  config: GameConfig;
};
// Deterministic synthetic policy for measurement only; this is not human match data.
function choice(view: GameView) {
  const d = view.decision!;
  const selection = d.selection;
  let selected: string[] = [];
  if (selection?.allocation) {
    for (const id of [...selection.cards].sort(
      (a, b) =>
        Number(view.cards.find(c => c.id === b)?.face?.kind === 'base') -
        Number(view.cards.find(c => c.id === a)?.face?.kind === 'base'),
    )) {
      const amount = Math.min(
        selection.min - selected.length,
        selection.allocation.limits[id] ?? 0,
      );
      selected.push(...Array.from({ length: amount }, () => id));
    }
  } else if (selection?.disclose) selected = [...selection.cards];
  else if (selection) {
    let budget = selection.budget?.max ?? Infinity;
    const resources = view.cards.filter(
      c => c.zone === 'resources' && c.face?.kind !== 'player-token',
    ).length;
    const count =
      d.kind === 'resource' && resources < 18 ? Math.max(1, selection.min) : selection.min;
    for (const id of selection.cards) {
      const cost = selection.budget?.costs[id] ?? 0;
      if (selected.length < count && cost <= budget) {
        selected.push(id);
        budget -= cost;
      }
    }
  }
  const option =
    d.options.find(o => o.kind === 'initiative') ??
    d.options.find(o => o.kind === 'mulligan' && o.takeMulligan === false) ??
    d.options.find(o => o.kind === 'resource') ??
    d.options.find(o => o.kind === 'use-ability' && o.action?.deploymentAvailable) ??
    d.options.find(
      o => o.kind === 'attack' && view.cards.find(c => c.id === o.cards[1])?.face?.kind === 'base',
    ) ??
    d.options.find(o => o.kind === 'play') ??
    d.options.find(o => o.kind === 'attack') ??
    d.options.find(o => o.kind === 'decline-effect') ??
    d.options.find(o => o.kind === 'take-initiative') ??
    d.options.find(o => o.kind === 'pass') ??
    d.options[0]!;
  if (option.kind === 'decline-effect') selected = [];
  if (option.kind === 'accept-effect' && !disclosureComplete(selection?.disclose, selected))
    throw new Error('No viable disclosure');
  return { option, selections: selected };
}

export function historySamples(attempts = 24) {
  const decks = targets.top8.filter(
    d => d.leader && d.base && !d.secondLeader && d.cards.some(c => c.board === 1),
  );
  const samples: HistorySample[] = [];
  let failed = 0;
  for (let n = 0; n < attempts; n++) {
    const index = Math.floor((n * decks.length) / attempts) % decks.length;
    const config: GameConfig = {
      gameId: `history-benchmark-${randomUUID()}`,
      players: [decks[index]!, decks[(index + 1) % decks.length]!].map((d, i) => ({
        id: i ? 'p2' : 'p1',
        leader: d.leader!,
        base: d.base!,
        deck: d.cards
          .filter(c => c.board === 1)
          .map(c => ({ cardId: c.cardId, quantity: c.quantity })),
      })) as GameConfig['players'],
    };
    let seed = 41 + n;
    const random = (upper: number) => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed % upper;
    };
    const resolve = (input: GameState) => {
      let state = input;
      const inputs: EngineInput[] = [],
        facts: Fact[] = [];
      while (state.execution.random) {
        const request = state.execution.random;
        const input: EngineInput = {
          type: 'random',
          gameId: state.gameId,
          expectedRevision: state.revision,
          requestId: request.id,
          values: request.bounds.map(random),
        };
        const next = advance(state, input);
        state = next.state;
        inputs.push(input);
        facts.push(...next.facts);
      }
      return { state, inputs, facts };
    };
    let state = resolve(createGame(config)).state,
      cursor = initialCursor(),
      actions = 0;
    const first = encodeState(state);
    const initial = {
      sequence: 0,
      revision: state.revision,
      stateHash: stateDigest(first),
      checkpoint: first,
    };
    const history: History = {
      gameId: state.gameId,
      versions: state.versions,
      sequence: 0,
      revision: state.revision,
      stateHash: initial.stateHash,
      checkpoint: initial,
      journal: [],
      summary: null,
    };
    const checkpoints = [initial];
    const projectors = new Map(
      state.seats.map(playerId => [
        playerId,
        new Projector(state.gameId, { role: 'player', playerId }),
      ]),
    );
    try {
      while (!state.result && history.journal.length < 500) {
        const before = state,
          projector = projectors.get(state.execution.decision!.playerId)!,
          view = projector.project(state),
          selected = choice(view);
        const input = projector.command(state, {
          gameId: state.gameId,
          epoch: view.epoch,
          expectedRevision: view.revision,
          decisionId: view.decision!.id,
          optionId: selected.option.id,
          selections: selected.selections,
          ...(view.decision?.effect === 'choose-number' ? { chosenNumber: 0 } : {}),
          ...(view.decision?.effect === 'name-card' ? { namedCardId: 'battlefield-marine' } : {}),
        });
        if (view.decision?.kind === 'action') actions++;
        const transition = advance(state, input),
          resolved = resolve(transition.state);
        state = resolved.state;
        const timeline = stepTimeline(cursor, before, state, input);
        cursor = cursorOf(timeline);
        const checkpoint = encodeState(state),
          stateHash = stateDigest(checkpoint),
          sequence = cursor.sequence;
        history.journal.push({
          sequence,
          actorId: input.type === 'random' ? 'p1' : input.playerId,
          commandId: randomUUID(),
          requestHash: stateDigest(JSON.stringify(input)),
          fromRevision: before.revision,
          revision: state.revision,
          stateHash,
          inputs: [input, ...resolved.inputs],
          facts: [...transition.facts, ...resolved.facts],
          timeline,
        });
        if (sequence % 20 === 0 || state.result)
          checkpoints.push({ sequence, revision: state.revision, stateHash, checkpoint });
        Object.assign(history, {
          sequence,
          revision: state.revision,
          stateHash,
          summary: state.result ? { result: state.result, round: state.round } : null,
        });
      }
      if (state.result) samples.push({ history, checkpoints, actions, config });
      else failed++;
    } catch {
      failed++;
    }
  }
  return { samples, failed, attempts };
}
