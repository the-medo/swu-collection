import { losesOwnAbilities } from './lasting.ts';
import { cardDefinition } from '../cards/catalog.ts';
import { attachedUpgrades } from './attachments.ts';
import type { CardInstance, GameState } from './model.ts';
import { upgradeProfile } from './roles.ts';
export function attackOverrides(state: GameState, unit: CardInstance) {
  if (
    !state.attacks.some(
      a =>
        a.attacker.instanceId === unit.instanceId &&
        a.attacker.incarnation === unit.incarnation &&
        !a.removedFromCombat.some(
          ref => ref.instanceId === unit.instanceId && ref.incarnation === unit.incarnation,
        ),
    )
  )
    return [];
  return attachedUpgrades(state, unit).filter(
    c =>
      !losesOwnAbilities(state, c) &&
      upgradeProfile(cardDefinition(state, c.cardId))?.attackOverride?.length,
  );
}

// Direct upgrade text remains active when the host loses its own abilities.
export function losesAttackingOverwhelm(state: GameState, unit: CardInstance) {
  return state.attacks.some(attack => {
    if (
      attack.attacker.instanceId !== unit.instanceId ||
      attack.attacker.incarnation !== unit.incarnation ||
      attack.removedFromCombat.some(
        r => r.instanceId === unit.instanceId && r.incarnation === unit.incarnation,
      )
    )
      return false;
    const defender = state.cards[attack.defender.instanceId];
    return (
      defender &&
      defender.incarnation === attack.defender.incarnation &&
      !attack.removedFromCombat.some(
        r => r.instanceId === defender.instanceId && r.incarnation === defender.incarnation,
      ) &&
      attachedUpgrades(state, defender).some(
        upgrade =>
          !losesOwnAbilities(state, upgrade) &&
          upgradeProfile(cardDefinition(state, upgrade.cardId))?.defendingAttackerLosesOverwhelm,
      )
    );
  });
}
