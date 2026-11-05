import { activeLasting } from './lasting.ts';
import { effectiveAbilities } from './effective-abilities.ts';
import { isUnit, unitStats } from './attachments.ts';
import { instance } from './state.ts';
import type { CardInstance, Frame, GameState, Intent } from './model.ts';
export const attackDefenders = (attack: GameState['attacks'][number]) => [
  attack.defender,
  ...(attack.additionalDefender ? [attack.additionalDefender] : []),
];
export type Attack = GameState['attacks'][number];
export function inCombat(
  state: GameState,
  attack: Attack,
  card: CardInstance,
  ref: Attack['attacker'],
) {
  return (
    isUnit(state, card) &&
    card.incarnation === ref.incarnation &&
    !attack.removedFromCombat.some(
      r => r.instanceId === ref.instanceId && r.incarnation === ref.incarnation,
    )
  );
}
export function combatAmount(state: GameState, attack: Attack, card: CardInstance) {
  if (activeLasting(state, card).some(e => e.cannotDealCombatDamage)) return 0;
  const stats = unitStats(state, card);
  return attack.damageStat === 'remaining-hp' &&
    card.instanceId === attack.attacker.instanceId &&
    card.incarnation === attack.attacker.incarnation
    ? Math.max(0, stats.hp - card.damage)
    : stats.power;
}
export function combatOrderIntents(
  state: GameState,
  frame: Extract<Frame, { kind: 'combat-order' }>,
): Intent[] {
  const attack = state.attacks.find(a => a.id === frame.attackId);
  if (!attack || attack.order) return [];
  const attacker = instance(state, attack.attacker.instanceId),
    defender = instance(state, attack.defender.instanceId);
  if (
    !inCombat(state, attack, attacker, attack.attacker) ||
    !attackDefenders(attack).some(ref =>
      inCombat(state, attack, instance(state, ref.instanceId), ref),
    )
  )
    return [];
  const a = effectiveAbilities(state, attacker),
    d = {
      combatDamageLast: attackDefenders(attack).some(ref => {
        const unit = instance(state, ref.instanceId);
        return (
          inCombat(state, attack, unit, ref) && effectiveAbilities(state, unit).combatDamageLast
        );
      }),
    };
  const first = attack.attackerFirst || a.firstCombatDamage;
  if (a.combatDamageLast && (d.combatDamageLast || first))
    return ['attacker-first', 'defender-first'].map(mode => ({ kind: 'choose-mode', mode }));
  if (!a.defenderCombatFirst) return [];
  return [first || d.combatDamageLast ? 'attacker-first' : 'simultaneous', 'defender-first'].map(
    mode => ({ kind: 'choose-mode', mode }),
  );
}
