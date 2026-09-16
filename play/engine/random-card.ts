import { boundReference } from './bindings.ts';
import { contextController } from './bindings.ts';
import { matchingUnits } from './targets.ts';
import type { Frame, GameState } from './model.ts';
import { reference } from './state.ts';
import { effectFrames } from './triggers.ts';
type RandomCard = Extract<Frame, { kind: 'random-card' }>;
export function assertRandomCard(state: GameState, frame: RandomCard) {
  if (
    !state.seats.includes(frame.playerId) ||
    !frame.cards.length ||
    new Set(frame.cards.map(c => c.instanceId)).size !== frame.cards.length ||
    frame.cards.some(ref => {
      const card = state.cards[ref.instanceId];
      return (
        !card ||
        card.cardId !== ref.cardId ||
        card.incarnation !== ref.incarnation ||
        card.visibility !== ref.visibility ||
        card.leaderSide !== ref.leaderSide
      );
    })
  )
    throw new Error('Invalid random card pool');
}
export function planRandomCard(
  state: GameState,
  frame: Extract<Frame, { kind: 'effect' }>,
): RandomCard | undefined {
  const { kind, effect, ...context } = frame;
  if (effect.kind !== 'random-card') throw new Error('Expected random card effect');
  const cards = effect.units
    ? matchingUnits(state, contextController(frame), effect.units, frame).map(reference)
    : effect.group
      ? [...(frame.groups?.[effect.group] ?? [])]
      : (effect.targets ?? []).flatMap(name => {
          const ref = boundReference(frame, name, state);
          return ref ? [reference(ref)] : [];
        });
  if (!cards.length || (effect.targets && cards.length !== effect.targets.length)) return;
  const next: RandomCard = {
    ...context,
    kind: 'random-card',
    cards,
    bind: effect.bind,
    effects: structuredClone([...effect.effects]),
  };
  assertRandomCard(state, next);
  return next;
}
export function resolveRandomCard(state: GameState, frame: RandomCard, index: number) {
  assertRandomCard(state, frame);
  const card = frame.cards[index];
  if (!card) throw new Error('Invalid random card index');
  state.execution.frames.unshift(
    ...effectFrames(frame.playerId, frame.source, frame.effects, {
      ...frame,
      bindings: { ...frame.bindings, [frame.bind]: card },
    }),
  );
}
