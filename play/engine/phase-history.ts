import { supportsEngine } from './release.ts';
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
export function friendlyUnitsEnterReady(state: GameState, playerId: string, token = false) {
  return abilitySources(state).some(
    source =>
      source.controller === playerId &&
      (effectiveAbilities(state, source).friendlyUnitsEnterReady ||
        (token && effectiveAbilities(state, source).friendlyTokenUnitsEnterReady)),
  );
}
export function discardCards(
  state: GameState,
  cards: CardInstance[],
  actor: string,
  source: CardInstance,
  byOwner = false,
) {
  if (!cards.length) return;
  for (const player of byOwner ? new Set(cards.map(c => c.owner)) : [actor])
    if (cards.some(c => c.owner === player && ['hand', 'deck'].includes(c.zone)))
      recordPhasePlayer(state.phaseHistory.ownCardsDiscarded, player);
  const handOwners = new Set(cards.filter(c => c.zone === 'hand').map(c => c.owner));
  for (const owner of byOwner ? [] : handOwners)
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
  if (byOwner)
    for (const owner of handOwners)
      collectTriggers(
        state,
        'own-hand-revealed-or-discarded',
        abilitySources(state).filter(c => c.controller === owner),
      );
  for (const entry of discarded) {
    state.phaseHistory.discarded.push({
      card: reference(entry.card),
      from: entry.from,
      owner: entry.owner,
    });
    collectTriggers(state, 'discarded', [entry.card]);
    if (entry.from === 'hand')
      collectTriggers(state, 'hand-card-discarded', abilitySources(state), entry.card);
  }
  for (const player of byOwner ? new Set(cards.map(c => c.owner)) : [actor]) {
    const selected = byOwner ? cards.filter(c => c.owner === player) : cards;
    fact(state, 'discarded', player, [source, ...selected], selected.length);
  }
  for (const card of fromDeck) collectTriggers(state, 'own-deck-card-discarded', observers, card);
}
export function recordUnitEntry(state: GameState, card: CardInstance) {
  // Events never enter play. Upgrades still have entry history, but not unit-entry triggers.
  if (cardDefinition(state, card.cardId).kind === 'event') return;
  if (supportsEngine('1.5.0', state.versions.engine) && !unitIsLeader(state, card))
    card.enteredRound = state.round;
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
