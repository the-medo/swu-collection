import { reference } from './state.ts';
import { supportsEngine } from './release.ts';
import { cannotReady } from './lasting.ts';
import { isUnit, attachedUpgrades } from './attachments.ts';
import { collectTriggers } from './triggers.ts';
import type { CardInstance, GameState } from './model.ts';
// Readying is a transition in play; entering ready is not a ready event.
// Commit simultaneous readiness before capturing abilities, so all resources
// are available when regroup-ready abilities resolve.
export function readyInPlay(
  state: GameState,
  cards: readonly CardInstance[],
  regroup = false,
  actor?: string,
) {
  const changed = [...new Map(cards.map(card => [card.instanceId, card])).values()].filter(
    card =>
      card.exhausted &&
      ['base', 'ground', 'space', 'resources'].includes(card.zone) &&
      !cannotReady(state, card, regroup, actor),
  );
  for (const card of changed) {
    card.exhausted = false;
    if (
      state.phase === 'regroup' &&
      supportsEngine('1.3.0', state.versions.engine) &&
      isUnit(state, card) &&
      (card.zone === 'ground' || card.zone === 'space')
    )
      (state.phaseHistory.regroupReadied ??= []).push({
        card: reference(card),
        playerId: actor ?? card.controller,
        arena: card.zone,
      });
  }
  collectTriggers(
    state,
    'readied',
    changed.filter(card => isUnit(state, card)),
  );
  for (const unit of changed.filter(card => isUnit(state, card)))
    collectTriggers(state, 'host-readied', attachedUpgrades(state, unit), unit);
  return changed;
}
