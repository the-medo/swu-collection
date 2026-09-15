import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-foundations.json.
export const heirloomLightsaber = {
  cardId: 'heirloom-lightsaber',
  name: 'Heirloom Lightsaber',
  kind: 'upgrade',
  aspects: ['Vigilance', 'Heroism'],
  traits: ['Item', 'Weapon', 'Lightsaber'],
  cost: 2,
  token: false,
  modifiers: {
    power: 2,
    hp: 2,
  },
  attachTo: 'non-vehicle',
  grantsIf: {
    trait: 'Force',
  },
  grants: {
    restore: 1,
  },
} as const satisfies UpgradeDefinition;
