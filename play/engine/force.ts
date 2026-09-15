import { recordTokenCreation } from './phase-history.ts';
import { abilitySources, collectTriggers } from './triggers.ts';
import type { CardInstance, GameState } from './model.ts';
import { addCard, fact, instance, move } from './state.ts';
export function forceToken(state: GameState, playerId: string) {
  return state.players[playerId]!.tokens.map(id => instance(state, id)).find(
    c => c.cardId === 'the-force',
  );
}
export function gainForce(state: GameState, playerId: string, source?: CardInstance) {
  if (forceToken(state, playerId)) return;
  const token = addCard(state, playerId, 'the-force', 'base');
  recordTokenCreation(state, playerId);
  fact(state, 'created', playerId, source ? [source, token] : [token]);
}
export function useForce(state: GameState, playerId: string, source: CardInstance) {
  const token = forceToken(state, playerId);
  if (!token) throw new Error('The Force is not with this player');
  fact(state, 'force-used', playerId, [source, token]);
  move(state, token, 'set-aside');
  state.phaseHistory.forceUsed[playerId] = (state.phaseHistory.forceUsed[playerId] ?? 0) + 1;
  collectTriggers(
    state,
    'force-used',
    abilitySources(state).filter(c => c.controller === playerId),
    source,
  );
}
