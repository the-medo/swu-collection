import { losesOwnAbilities } from '../engine/lasting.ts';
import { cannotPlayCard } from '../engine/play-restrictions.ts';
import type { CardInstance, GameState } from '../engine/model.ts';

/** Only call for a face that this viewer may see. Names come from public facts,
 * and cannot follow a source into a new rules incarnation. */
export function cardMarkers(state: GameState, card: CardInstance) {
  const notes = ['ground', 'space', 'base'].includes(card.zone)
    ? [
        ...new Set(
          state.facts
            .filter(
              f =>
                f.audience === 'public' &&
                f.type === 'card-named' &&
                f.cards.some(
                  ref => ref.instanceId === card.instanceId && ref.incarnation === card.incarnation,
                ),
            )
            .flatMap(f => (f.namedCard ? [f.namedCard] : [])),
        ),
      ]
    : [];
  const warnings: string[] = [];
  if (losesOwnAbilities(state, card)) {
    warnings.push('This card has lost its abilities.');
    if (card.cardId === 'shield') warnings.push('This Shield does not prevent damage.');
  }
  if (
    ['hand', 'resources', 'discard'].includes(card.zone) &&
    cannotPlayCard(state, card, card.controller, true)
  )
    warnings.push('This card cannot be played.');
  return { ...(notes.length ? { notes } : {}), ...(warnings.length ? { warnings } : {}) };
}
