import { activeAbilities } from './abilities.ts';
import type { CardInstance, GameState } from './model.ts';
import { fact } from './state.ts';
import { abilitySources, collectTriggers, captureTriggers } from './triggers.ts';

// A multi-card draw is one observed event, including drawing chosen search cards.
// The public count and private faces share the same event boundary.
export function recordDraw(state: GameState, playerId: string, cards: CardInstance[]) {
  fact(state, 'drawn', playerId, [], cards.length);
  if (!cards.length) return;
  state.phaseHistory.cardsDrawn[playerId] =
    (state.phaseHistory.cardsDrawn[playerId] ?? 0) + cards.length;
  fact(state, 'drawn', playerId, cards, cards.length, [playerId]);
  collectTriggers(
    state,
    'cards-drawn',
    abilitySources(state).filter(c => c.controller === playerId),
    undefined,
    {
      values: { 'draw-count': cards.length },
    },
  );
  collectTriggers(
    state,
    'enemy-cards-drawn',
    abilitySources(state).filter(c => c.controller !== playerId),
    undefined,
    {
      values: { 'draw-count': cards.length },
    },
  );
  const otherTriggers =
    state.execution.pendingTriggers.length > 0 ||
    state.execution.frames.some(f =>
      f.kind === 'trigger-batch' || f.kind === 'queue-triggers'
        ? f.triggers.length > 0
        : f.kind === 'optional-trigger',
    );
  const drawnTriggers = captureTriggers(
    state,
    'drawn',
    cards.filter(card => activeAbilities(state, card).triggers?.some(t => t.timing === 'drawn')),
    undefined,
    { silent: true },
  );
  for (const trigger of drawnTriggers)
    fact(
      state,
      'triggered',
      playerId,
      [trigger.source],
      undefined,
      otherTriggers || drawnTriggers.length > 1 ? 'public' : [playerId],
    );
  state.execution.pendingTriggers.push(...drawnTriggers);
}
