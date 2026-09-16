import type { CardInstance, DelayedEffect, GameState } from './model.ts';
import { allocateId, fact, reference } from './state.ts';

export function scheduleRegroup(
  state: GameState,
  playerId: string,
  source: CardInstance,
  unit: CardInstance,
  kind: Exclude<
    DelayedEffect['kind'],
    | 'effects-at-action'
    | 'effects-at-regroup'
    | 'victory-at-regroup'
    | 'resources-at-action'
    | 'resources-at-regroup'
    | 'regroup-operation'
  > = 'defeat-at-regroup',
  dueRound = state.phase === 'regroup' ? state.round + 1 : state.round,
  origin?: import('./model.ts').AbilityOrigin,
) {
  const effect: DelayedEffect = {
    id: allocateId(state, 'l'),
    kind,
    playerId,
    source: structuredClone(source),
    target: reference(unit),
    dueRound,
    ...(origin ? { origin: structuredClone(origin) } : {}),
  };
  state.delayedEffects.push(effect);
  fact(state, 'delayed-scheduled', playerId, [source, unit]);
}
export function collectRegroupEffects(state: GameState) {
  const due = state.delayedEffects.filter(
    effect =>
      effect.kind !== 'effects-at-action' &&
      effect.kind !== 'resources-at-action' &&
      effect.kind !== 'control-on-departure' &&
      effect.dueRound === state.round,
  );
  state.delayedEffects = state.delayedEffects.filter(effect => !due.includes(effect));
  if (due.length)
    state.execution.frames.unshift({ kind: 'delayed-batch', playerId: null, effects: due });
}

export function scheduleRegroupEffects(
  state: GameState,
  playerId: string,
  source: CardInstance,
  effects: readonly import('../cards/definition.ts').CardEffect[],
) {
  state.delayedEffects.push({
    id: allocateId(state, 'l'),
    kind: 'effects-at-regroup',
    playerId,
    source: structuredClone(source),
    target: null,
    dueRound: state.phase === 'regroup' ? state.round + 1 : state.round,
    effects: structuredClone([...effects]),
  });
  fact(state, 'delayed-scheduled', playerId, [source]);
}

export function containsRescueSchedule(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  return (
    ('kind' in value &&
      value.kind === 'capture-unit' &&
      'rescueAtRegroup' in value &&
      value.rescueAtRegroup === true) ||
    Object.values(value).some(containsRescueSchedule)
  );
}
export function containsReturnSchedule(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  return (
    ('kind' in value && value.kind === 'schedule-return') ||
    Object.values(value).some(containsReturnSchedule)
  );
}

export function scheduleNextAction(
  state: GameState,
  playerId: string,
  source: CardInstance,
  effects: readonly import('../cards/definition.ts').CardEffect[],
) {
  state.delayedEffects.push({
    id: allocateId(state, 'l'),
    kind: 'effects-at-action',
    playerId,
    source: structuredClone(source),
    target: null,
    dueRound: state.round + 1,
    effects: structuredClone([...effects]),
  });
  fact(state, 'delayed-scheduled', playerId, [source]);
}
export function collectActionEffects(state: GameState) {
  const due = state.delayedEffects.filter(
    e =>
      (e.kind === 'effects-at-action' || e.kind === 'resources-at-action') &&
      e.dueRound === state.round,
  );
  state.delayedEffects = state.delayedEffects.filter(e => !due.includes(e));
  if (due.length)
    state.execution.frames.unshift({ kind: 'delayed-batch', playerId: null, effects: due });
}
export function containsActionSchedule(value: unknown, effects: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  return (
    ('kind' in value &&
      value.kind === 'schedule-next-action' &&
      'effects' in value &&
      JSON.stringify(value.effects) === JSON.stringify(effects)) ||
    Object.values(value).some(v => containsActionSchedule(v, effects))
  );
}

export function containsRegroupEffects(value: unknown, effects: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  return (
    ('kind' in value &&
      value.kind === 'schedule-regroup-effects' &&
      'effects' in value &&
      JSON.stringify(value.effects) === JSON.stringify(effects)) ||
    Object.values(value).some(v => containsRegroupEffects(v, effects))
  );
}

export function controlSourceLeft(state: GameState, effect: DelayedEffect) {
  const source = state.cards[effect.source.instanceId];
  return (
    !source ||
    source.incarnation !== effect.source.incarnation ||
    !['base', 'ground', 'space'].includes(source.zone)
  );
}
export function collectDepartureEffects(state: GameState) {
  const due = state.delayedEffects.filter(
    e => e.kind === 'control-on-departure' && controlSourceLeft(state, e),
  );
  state.delayedEffects = state.delayedEffects.filter(e => !due.includes(e));
  if (due.length)
    state.execution.frames.unshift({ kind: 'delayed-batch', playerId: null, effects: due });
}
export function containsControlSchedule(
  value: unknown,
  timing: 'regroup' | 'source-leaves',
): boolean {
  if (!value || typeof value !== 'object') return false;
  return (
    ('kind' in value &&
      value.kind === 'take-control' &&
      'returnWhen' in value &&
      value.returnWhen === timing) ||
    Object.values(value).some(v => containsControlSchedule(v, timing))
  );
}

export function containsVictorySchedule(value: unknown, arena: 'ground' | 'space'): boolean {
  if (!value || typeof value !== 'object') return false;
  return (
    ('kind' in value &&
      value.kind === 'schedule-regroup-victory' &&
      'arena' in value &&
      value.arena === arena) ||
    Object.values(value).some(v => containsVictorySchedule(v, arena))
  );
}

export function containsResourceRepayment(value: unknown, at: 'regroup' | 'next-action'): boolean {
  if (!value || typeof value !== 'object') return false;
  return (
    ('kind' in value &&
      value.kind === 'schedule-resource-repayment' &&
      'at' in value &&
      value.at === at) ||
    Object.values(value).some(v => containsResourceRepayment(v, at))
  );
}

export function containsRegroupOperation(value: unknown, operation: 'bottom' | 'defeat'): boolean {
  if (!value || typeof value !== 'object') return false;
  return (
    ('kind' in value &&
      value.kind === 'schedule-regroup-operation' &&
      'operation' in value &&
      value.operation === operation) ||
    Object.values(value).some(v => containsRegroupOperation(v, operation))
  );
}
