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
              (c.instanceId !== attack.defender.instanceId ||
                c.incarnation !== attack.defender.incarnation),
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
