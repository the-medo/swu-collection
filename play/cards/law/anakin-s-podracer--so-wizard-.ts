import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in meta-combat-order.json.
export const anakinSPodracerSoWizard = {
  cardId: 'anakin-s-podracer--so-wizard-',
  kind: 'unit',
  name: "Anakin's Podracer, So Wizard!",
  cost: 3,
  aspects: ['Cunning', 'Heroism'],
  traits: ['Vehicle', 'Speeder'],
  power: 3,
  hp: 2,
  unique: true,
  arena: 'ground',
  keywords: ['Ambush'],
  constant: [
    {
      condition: { kind: 'no-other-unit-attacked', target: 'source' },
      abilities: { firstCombatDamage: true },
    },
  ],
} as const satisfies UnitDefinition;
