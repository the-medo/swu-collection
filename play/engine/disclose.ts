import type { CardEffect } from '../cards/definition.ts';
import { cardDefinition } from '../cards/catalog.ts';
import type { EffectContext } from './bindings.ts';
import type { GameState, Frame } from './model.ts';
import { instance, opponent } from './state.ts';
export function disclosePlayer(
  state: GameState,
  playerId: string,
  effect: Extract<CardEffect, { kind: 'disclose' }>,
  context: EffectContext,
) {
  return effect.player === 'enemy'
    ? opponent(state, playerId)
    : effect.player === 'defender'
      ? state.attacks.findLast(
          a =>
            a.attacker.instanceId === context.source.instanceId &&
            a.attacker.incarnation === context.source.incarnation,
        )?.defendingPlayer
      : playerId;
}
export function disclosureSelection(state: GameState, frame: Extract<Frame, { kind: 'disclose' }>) {
  const cards = [...state.players[frame.chooser]!.hand];
  return {
    cards,
    min: 0,
    max: cards.length,
    disclose: {
      required: [...frame.effect.aspects],
      icons: Object.fromEntries(
        cards.map(id => [id, [...cardDefinition(state, instance(state, id).cardId).aspects]]),
      ),
    },
  };
}
export function disclosureSatisfied(
  required: readonly string[],
  icons: Record<string, string[]>,
  cards: readonly string[],
) {
  const supplied = cards.flatMap(id => icons[id] ?? []);
  for (const aspect of required) {
    const at = supplied.indexOf(aspect);
    if (at < 0) return false;
    supplied.splice(at, 1);
  }
  return true;
}
