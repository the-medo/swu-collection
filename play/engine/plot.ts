import { effectiveAbilities } from './effective-abilities.ts';
import type { CardEffect } from '../cards/definition.ts';
import type { CardInstance, GameState } from './model.ts';
import { instance, reference } from './state.ts';
export function plotCards(state: GameState, playerId: string) {
  return state.players[playerId]!.resources.map(id => instance(state, id)).filter(c =>
    effectiveAbilities(state, c).keywords?.includes('Plot'),
  );
}
export const plotPlay = {
  kind: 'play-card',
  using: 'plot',
  from: 'resources',
  target: 'source',
  filter: {},
  optional: true,
  replaceResource: true,
} as const satisfies CardEffect;
export function offerPlot(state: GameState, leader: CardInstance) {
  const cards = plotCards(state, leader.controller);
  if (cards.length)
    state.execution.frames.unshift({
      kind: 'plot-reveal',
      playerId: leader.controller,
      source: structuredClone(leader),
      cards: cards.map(reference),
    });
}
