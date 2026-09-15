import { expect, test } from 'bun:test';
import targets from './fixtures/meta-targets.json';
import { LocalGame, replay } from '../host/session.ts';
import { decodeState, encodeState } from '../engine/checkpoint.ts';
import { Projector } from '../projection/projector.ts';
import type { GameConfig } from '../engine/state.ts';
import type { GameView } from '../view/types.ts';
import { disclosureComplete } from '../view/types.ts';

const decks = targets.top8.filter(
  d => d.leader && d.base && !d.secondLeader && d.cards.some(c => c.board === 1),
);

// A deterministic progression policy, not an opponent AI or card conformance claim.
// Only choices and identities present in this player's projection guide the policy.
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
for (const [n, deck] of decks.entries())
  test(`complete imported Top 8 deck plays and replays: ${deck.name}, place ${deck.placement}`, () => {
    const other = decks[(n + 1) % decks.length]!;
    const config: GameConfig = {
      gameId: `meta-top8-${n}`,
      players: [deck, other].map((d, i) => ({
        id: i === 0 ? 'alice' : 'bob',
        leader: d.leader!,
        base: d.base!,
        deck: d.cards
          .filter(c => c.board === 1)
          .map(c => ({ cardId: c.cardId, quantity: c.quantity })),
      })) as GameConfig['players'],
    };
    let seed = 41 + n;
    const game = new LocalGame(config, upper => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed % upper;
    });
    const viewers = new Map(
      ['alice', 'bob'].map(playerId => [
        playerId,
        new Projector(config.gameId, { role: 'player', playerId }),
      ]),
    );
    let commands = 0;
    while (!game.state.result && commands++ < 1500) {
      const state = game.state,
        viewer = viewers.get(state.execution.decision!.playerId)!,
        view = viewer.project(state);
      expect(decodeState(encodeState(state))).toEqual(state);
      const selected = choice(view);
      game.submit(
        viewer.command(state, {
          gameId: config.gameId,
          epoch: view.epoch,
          expectedRevision: view.revision,
          decisionId: view.decision!.id,
          optionId: selected.option.id,
          selections: selected.selections,
          ...(view.decision?.effect === 'choose-number' ? { chosenNumber: 0 } : {}),
          ...(view.decision?.effect === 'name-card' ? { namedCardId: 'battlefield-marine' } : {}),
        }),
      );
    }
    expect(game.state.result).not.toBeNull();
    expect(replay(JSON.parse(JSON.stringify(game.recording)))).toEqual(game.state);
  }, 30_000);
