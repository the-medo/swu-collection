import { discardCards } from './phase-history.ts';
import type { CardEffect } from '../cards/definition.ts';
import { boundController, type EffectContext } from './bindings.ts';
import { matchesCard } from './inspection.ts';
import type { Frame, GameState } from './model.ts';
import { fact, instance, move, opponent, reference } from './state.ts';
export type ZoneSearch = Extract<Frame, { kind: 'zone-search' }>;
export function zoneSearchOwner(
  state: GameState,
  actor: string,
  effect: Extract<CardEffect, { kind: 'search-zones' }>,
  context: EffectContext,
) {
  return effect.player === 'self'
    ? actor
    : effect.player === 'enemy'
      ? opponent(state, actor)
      : effect.ownerOf
        ? boundController(state, context, effect.ownerOf)
        : undefined;
}
export function zoneSearchCards(
  state: GameState,
  owner: string,
  effect: Extract<CardEffect, { kind: 'search-zones' }>,
) {
  return effect.zones.flatMap(zone =>
    state.players[owner]![zone].map(id => reference(instance(state, id))),
  );
}
export function zoneSearchSelection(state: GameState, frame: ZoneSearch) {
  const cards = frame.cards
    .filter(ref => matchesCard(state, ref, frame.effect.filter, frame))
    .map(ref => ref.instanceId);
  // V8 §8.26.6 permits failure to reveal a matching hidden card, including when
  // the search describes each matching card rather than an explicit maximum.
  return { cards, min: 0, max: cards.length };
}
export function assertZoneSearch(state: GameState, frame: ZoneSearch) {
  if (
    new Set(frame.effect.zones).size !== frame.effect.zones.length ||
    frame.owner !== zoneSearchOwner(state, frame.playerId, frame.effect, frame) ||
    JSON.stringify(frame.cards.map(reference)) !==
      JSON.stringify(zoneSearchCards(state, frame.owner, frame.effect))
  )
    throw new Error('Invalid multi-zone search');
}
export function finishZoneSearch(state: GameState, frame: ZoneSearch, selected: string[]) {
  const cards = selected.map(id => instance(state, id));
  discardCards(state, cards, frame.playerId, frame.source);
  if (frame.effect.zones.includes('deck'))
    state.execution.frames.unshift({ kind: 'shuffle', playerId: frame.owner });
}
