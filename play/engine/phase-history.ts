import { cardTraits, unitIsLeader } from './attributes.ts';
import { cardDefinition } from '../cards/catalog.ts';
import { effectiveAbilities } from './effective-abilities.ts';
import { isUnit } from './attachments.ts';
import type { CardInstance, GameState } from './model.ts';
import { fact, move, reference } from './state.ts';
import { abilitySources, collectTriggers } from './triggers.ts';

export function recordPhasePlayer(history: string[], playerId: string) {
  if (!history.includes(playerId)) history.push(playerId);
}
export function recordTokenCreation(state: GameState, playerId: string) {
  recordPhasePlayer(state.phaseHistory.tokensCreated, playerId);
}
export function friendlyUnitsEnterReady(state: GameState, playerId: string) {
  return abilitySources(state).some(
    source =>
      source.controller === playerId && effectiveAbilities(state, source).friendlyUnitsEnterReady,
  );
}
export function discardCards(
  state: GameState,
  cards: CardInstance[],
  actor: string,
  source: CardInstance,
) {
  if (!cards.length) return;
  if (cards.some(c => c.owner === actor && ['hand', 'deck'].includes(c.zone)))
    recordPhasePlayer(state.phaseHistory.ownCardsDiscarded, actor);
  for (const owner of new Set(cards.filter(c => c.zone === 'hand').map(c => c.owner)))
    collectTriggers(
      state,
      'own-hand-revealed-or-discarded',
      abilitySources(state).filter(c => c.controller === owner),
    );
  const discarded = cards
    .filter(c => c.zone === 'hand' || c.zone === 'deck')
    .map(card => ({ card, from: card.zone as 'hand' | 'deck', owner: card.owner }));
  const fromDeck = cards.filter(c => c.owner === actor && c.zone === 'deck');
  const observers = abilitySources(state).filter(c => c.controller === actor);
  for (const card of cards) move(state, card, 'discard');
  for (const entry of discarded) {
    state.phaseHistory.discarded.push({
      card: reference(entry.card),
      from: entry.from,
      owner: entry.owner,
    });
    collectTriggers(state, 'discarded', [entry.card]);
  }
  fact(state, 'discarded', actor, [source, ...cards], cards.length);
  for (const card of fromDeck) collectTriggers(state, 'own-deck-card-discarded', observers, card);
}
export function recordUnitEntry(state: GameState, card: CardInstance) {
  // Events never enter play. Upgrades still have entry history, but not unit-entry triggers.
  if (cardDefinition(state, card.cardId).kind === 'event') return;
  state.phaseHistory.entered.push(reference(card));
  if (isUnit(state, card)) {
    state.phaseHistory.unitEntries.push({
      leaderUnit: unitIsLeader(state, card),
      ...structuredClone(card),
      traits: [...cardTraits(state, card)],
    });
    collectTriggers(
      state,
      'friendly-entered',
      abilitySources(state).filter(c => c.controller === card.controller),
      card,
    );
  }
}

// Only an instruction explicitly revealing cards from a hand uses this hook.
// Drawing a revealed search result or showing payment legality is not such a reveal.
export function recordHandReveal(state: GameState, cards: readonly { instanceId: string }[]) {
  for (const owner of new Set(
    cards.flatMap(ref => {
      const card = state.cards[ref.instanceId];
      return card?.zone === 'hand' ? [card.owner] : [];
    }),
  ))
    collectTriggers(
      state,
      'own-hand-revealed-or-discarded',
      abilitySources(state).filter(c => c.controller === owner),
    );
}
