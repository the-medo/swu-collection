import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-attributes.json.
export const kyloRenSLightsaber = {
  cardId: 'kylo-ren-s-lightsaber',
  name: "Kylo Ren's Lightsaber",
  kind: 'upgrade',
  aspects: ['Vigilance', 'Villainy'],
  traits: ['Item', 'Weapon', 'Lightsaber'],
  unique: true,
  cost: 2,
  token: false,
  modifiers: {
    power: 1,
    hp: 3,
  },
  attachTo: 'non-vehicle',
  grantsIf: {
    trait: 'Force',
  },
  grants: {
    enemyAbilityImmunity: ['exhaust'],
  },
} as const satisfies UpgradeDefinition;
