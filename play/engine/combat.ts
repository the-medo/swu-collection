import { activeLasting } from './lasting.ts';
import { effectiveAbilities } from './effective-abilities.ts';
import { isUnit, unitStats } from './attachments.ts';
import { instance } from './state.ts';
import type { CardInstance, Frame, GameState, Intent } from './model.ts';
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
    !inCombat(state, attack, defender, attack.defender) ||
    !effectiveAbilities(state, attacker).defenderCombatFirst
  )
    return [];
  const first = attack.attackerFirst || effectiveAbilities(state, attacker).firstCombatDamage;
  return [first ? 'attacker-first' : 'simultaneous', 'defender-first'].map(mode => ({
    kind: 'choose-mode',
    mode,
  }));
}
