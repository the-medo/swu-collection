import { attackDefenders } from './combat.ts';
import type { CardInstance, Frame, GameState } from './model.ts';
import { isUnit, unitStats } from './attachments.ts';
import { survivesZeroHp } from './lasting.ts';
import { instance, reference } from './state.ts';
type DamageFrame = Extract<Frame, { kind: 'damage' }>;
// Excess exists only after the defending unit's damage replacements leave a
// lethal packet. Its destination's replacements run before the same event
// commits, so redirecting does not create a second combat damage step.
export function excessDamageChoice(state: GameState, frame: DamageFrame) {
  const assignment = frame.assignments.find(a => a.excessRoute);
  if (!assignment) return null;
  const route = assignment.excessRoute!;
  const primary = instance(state, assignment.target.instanceId);
  const amount = route.whole
    ? assignment.amount
    : !assignment.preventedBy &&
        !survivesZeroHp(state, primary) &&
        assignment.amount >= unitStats(state, primary).hp - primary.damage
      ? Math.max(0, assignment.amount - Math.max(0, unitStats(state, primary).hp - primary.damage))
      : 0;
  const attack = state.attacks.find(a => a.id === frame.combatAttackId)!;
  const targets =
    amount > 0
      ? state[route.arena]
          .map(id => instance(state, id))
          .filter(
            c =>
              isUnit(state, c) &&
              !attackDefenders(attack).some(
                ref => c.instanceId === ref.instanceId && c.incarnation === ref.incarnation,
              ),
          )
      : [];
  return { assignment, route, amount, targets };
}
export function finishExcessRouting(state: GameState, frame: DamageFrame, target?: CardInstance) {
  const choice = excessDamageChoice(state, frame);
  if (!choice) throw Error('Missing excess damage choice');
  const { assignment, route, amount, targets } = choice;
  if (target && !targets.some(c => c.instanceId === target.instanceId))
    throw Error('Illegal excess destination');
  delete assignment.excessRoute;
  if (target) {
    const attack = state.attacks.find(a => a.id === frame.combatAttackId)!;
    attack.routedExcess = reference(target);
    if (route.whole) assignment.target = reference(target);
    else {
      assignment.amount -= amount;
      assignment.redirectedAmount = amount;
      frame.assignments.push({
        target: reference(target),
        amount,
        source: structuredClone(assignment.source),
        preventedBy: null,
        ...(assignment.unpreventable ? { unpreventable: true } : {}),
      });
    }
  } else if (route.whole) {
    if (!route.overwhelm) assignment.amount = 0;
  } else if (route.overwhelm && amount > 0) {
    assignment.amount -= amount;
    assignment.redirectedAmount = amount;
    const attack = state.attacks.find(a => a.id === frame.combatAttackId)!;
    assignment.excess = {
      target: reference(instance(state, state.players[attack.defendingPlayer]!.base)),
      amount,
    };
  }
}

// Several defenders still produce one excess-damage packet from the attacker.
// First resolve every defender's replacements, then choose any excess route and
// resolve replacements on its destination before committing the entire combat.
export function consolidateMultiExcess(state: GameState, frame: DamageFrame) {
  const attack = state.attacks.find(a => a.id === frame.combatAttackId);
  if (!attack?.additionalDefender || frame.multiExcessResolved) return false;
  frame.multiExcessResolved = true;
  const base = instance(state, state.players[attack.defendingPlayer]!.base);
  let amount = 0;
  let source: DamageFrame['assignments'][number]['source'] = null;
  let route: NonNullable<DamageFrame['assignments'][number]['excessRoute']> | undefined;
  let unpreventable = false;
  for (const assignment of frame.assignments) {
    if (
      assignment.source?.instanceId !== attack.attacker.instanceId ||
      assignment.source.incarnation !== attack.attacker.incarnation
    )
      continue;
    source = assignment.source;
    unpreventable ||= !!assignment.unpreventable;
    const target = instance(state, assignment.target.instanceId);
    const routed = assignment.excessRoute;
    if (routed) {
      route = { ...routed, whole: true };
      const excess = routed.whole
        ? assignment.amount
        : !assignment.preventedBy &&
            !survivesZeroHp(state, target) &&
            assignment.amount >= unitStats(state, target).hp - target.damage
          ? Math.max(
              0,
              assignment.amount - Math.max(0, unitStats(state, target).hp - target.damage),
            )
          : 0;
      delete assignment.excessRoute;
      if (!routed.whole) {
        assignment.amount -= excess;
        if (excess) assignment.redirectedAmount = excess;
      } else assignment.amount = 0;
      amount += excess;
    } else if (assignment.excess) {
      if (
        !assignment.preventedBy &&
        !survivesZeroHp(state, target) &&
        assignment.amount >= unitStats(state, target).hp - target.damage
      )
        amount += assignment.excess.amount;
      delete assignment.excess;
    } else if (target.instanceId === base.instanceId) {
      // A missing defender with Overwhelm contributes its full attack damage.
      amount += assignment.amount;
      assignment.amount = 0;
    }
  }
  if (amount > 0)
    frame.assignments.push({
      target: reference(base),
      amount,
      source: structuredClone(source),
      preventedBy: null,
      ...(route ? { excessRoute: route } : {}),
      ...(unpreventable ? { unpreventable: true } : {}),
    });
  return true;
}
