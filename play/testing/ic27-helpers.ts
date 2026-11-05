import { advance } from '../engine/advance.ts';
import { decodeState, encodeState } from '../engine/checkpoint.ts';
import type { GameState, Intent } from '../engine/model.ts';
import catalog from '../cards/ic27/catalog.json';
import { choose, ids, position } from './helpers.ts';
import { scenario } from './scenario.ts';
export const card = (number: number) => catalog.find(c => c.cardNo === number)!.cardId;
export const resources = (n = 20) => Array.from({ length: n }, () => ({ card: ids.marine }));
export function ordered(state: GameState): GameState {
  for (let n = 0; n < 100; n++) {
    const random = state.execution.random;
    if (random) {
      state = advance(state, {
        type: 'random',
        gameId: state.gameId,
        expectedRevision: state.revision,
        requestId: random.id,
        values: random.bounds.map(() => 0),
      }).state;
      continue;
    }
    if (state.execution.decision?.kind !== 'trigger') return state;
    state = advance(
      state,
      choose(state, () => true),
    ).state;
  }
  throw new Error('Unsettled trigger ordering');
}
export const step = (
  state: GameState,
  intent: Intent['kind'] | ((intent: Intent) => boolean),
  selections: string[] = [],
) => ordered(advance(decodeState(encodeState(state)), choose(state, intent, selections)).state);
export const target = (state: GameState, id: string) =>
  step(state, i => i.kind === 'target' && i.card === id);
export const attack = (state: GameState, attacker: string, defender = state.players.bob!.base) =>
  step(state, i => i.kind === 'attack' && i.attacker === attacker && i.defender === defender);
export const play = (state: GameState, id: string) =>
  step(state, i => i.kind === 'play' && i.card === id);
export const use = (state: GameState, id: string, abilityId = 'action') =>
  step(state, i => i.kind === 'use-ability' && i.card === id && i.abilityId === abilityId);
export function gameWith(number: number, inHand = true) {
  const input = position(`ic27-${number}`);
  input.players[0].resources = resources();
  const row = catalog.find(c => c.cardNo === number)!;
  if (row.type === 'Leader') input.players[0].leader = { card: row.cardId, ref: 'card' };
  else if (inHand) input.players[0].hand = [{ card: row.cardId, ref: 'card' }];
  else
    input.players[0][row.arenas[0] === 'Space' ? 'space' : 'ground'] = [
      { card: row.cardId, ref: 'card' },
    ];
  return input;
}
export { choose, ids, position, scenario };
