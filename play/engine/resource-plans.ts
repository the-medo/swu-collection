import type { Decision, Frame, GameState } from './model.ts';
import { frameSelection } from './actions.ts';

type ResourceFrame = Extract<Frame, { kind: 'resource' }>;

/** Only the adjacent second resourcing step can be prepared early. No cards
 * move and no public fact is emitted until that step reaches the rules queue. */
export function resourcePlan(state: GameState, playerId: string) {
  const first = state.execution.frames[0],
    next = state.execution.frames[1];
  if (
    state.execution.decision?.kind !== 'resource' ||
    first?.kind !== 'resource' ||
    next?.kind !== 'resource' ||
    next.setup !== first.setup ||
    first.playerId === playerId ||
    next.playerId !== playerId
  )
    return null;
  return next;
}

export function decisionForPlayer(state: GameState, playerId: string): Decision | null {
  const current = state.execution.decision;
  if (current?.playerId === playerId) return current;
  const plan = resourcePlan(state, playerId);
  if (!plan || !current) return null;
  return {
    id: `${current.id}_resource_${plan.queuedResources ? 'ready' : 'choose'}`,
    kind: 'resource',
    playerId,
    options: [
      { id: 'o0', intent: { kind: plan.queuedResources ? 'cancel-resource' : 'resource' } },
    ],
    selection: plan.queuedResources ? null : frameSelection(state, plan, playerId),
  };
}

export function validResourcePlan(state: GameState, frame: ResourceFrame): boolean {
  const cards = frame.queuedResources;
  const selection = frameSelection(state, frame, frame.playerId)!;
  return (
    !!cards &&
    cards.length >= selection.min &&
    cards.length <= selection.max &&
    new Set(cards.map(c => c.instanceId)).size === cards.length &&
    cards.every(
      ref =>
        selection.cards.includes(ref.instanceId) &&
        state.cards[ref.instanceId]?.incarnation === ref.incarnation,
    )
  );
}
