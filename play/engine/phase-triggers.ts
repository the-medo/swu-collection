import type { CardInstance, Frame, GameState, Trigger, AbilityOrigin } from './model.ts';
import { allocateId, fact } from './state.ts';
import { scheduledDefinition } from './scheduled-definition.ts';
export function schedulePhaseTrigger(state: GameState, frame: Extract<Frame, { kind: 'effect' }>) {
  if (frame.effect.kind !== 'schedule-phase-trigger') throw new Error('Not a phase trigger');
  if (state.phase !== 'action' && state.phase !== 'regroup') return;
  const source = structuredClone(frame.source);
  const origin: AbilityOrigin = {
    id: `scheduled-${allocateId(state, 'l')}`,
    card: structuredClone(frame.origin?.card ?? source),
    profile: 'scheduled',
    scheduledId: frame.effect.id,
    withoutSupport: false,
  };
  const definition = scheduledDefinition(state, origin.card, origin.scheduledId);
  if (JSON.stringify(definition) !== JSON.stringify(frame.effect))
    throw new Error('Mismatched scheduled definition');
  const trigger: Trigger = {
    id: allocateId(state, 't'),
    playerId: frame.playerId,
    source,
    abilityId: `${origin.id}-${definition.id}`,
    abilities: [
      {
        id: 'self',
        card: structuredClone(source),
        profile: 'printed',
        withoutSupport: false,
        suppressed: true,
      },
      origin,
    ],
    ...(frame.bindings ? { bindings: structuredClone(frame.bindings) } : {}),
    ...(frame.groups ? { groups: structuredClone(frame.groups) } : {}),
    ...(frame.values ? { values: structuredClone(frame.values) } : {}),
    ...(frame.names ? { names: structuredClone(frame.names) } : {}),
  };
  state.phaseTriggers.push({
    round: state.round,
    phase: state.phase,
    timing: definition.timing,
    trigger,
  });
  fact(state, 'delayed-scheduled', frame.playerId, [source]);
}
export function takePhaseTriggers(
  state: GameState,
  playerId: string,
  timing: 'initiative-taken' | 'played-ability-used',
  subject?: CardInstance,
  values?: Record<string, number>,
): Trigger[] {
  const due = state.phaseTriggers.filter(
    e =>
      e.trigger.playerId === playerId &&
      e.timing === timing &&
      e.round === state.round &&
      e.phase === state.phase,
  );
  state.phaseTriggers = state.phaseTriggers.filter(e => !due.includes(e));
  return due.map(e => {
    const trigger = structuredClone(e.trigger);
    if (subject) trigger.subject = structuredClone(subject);
    if (values) trigger.values = { ...trigger.values, ...values };
    fact(state, 'triggered', playerId, [trigger.source]);
    return trigger;
  });
}
export function assertPhaseTriggers(state: GameState) {
  const seen = new Set<string>();
  for (const entry of state.phaseTriggers) {
    const origin = entry.trigger.abilities.find(o => o.profile === 'scheduled');
    if (
      !origin ||
      seen.has(entry.trigger.id) ||
      entry.round !== state.round ||
      entry.phase !== state.phase ||
      scheduledDefinition(state, origin.card, origin.scheduledId).timing !== entry.timing
    )
      throw new Error('Invalid phase trigger');
    seen.add(entry.trigger.id);
  }
}
