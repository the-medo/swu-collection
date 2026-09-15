import type { UnitDefinition } from '../definition.ts';

// Printed text and rulings are pinned in the meta-prevention fixture.
export const chewbaccaFaithfulFirstMate = {
  cardId: 'chewbacca--faithful-first-mate',
  name: 'Chewbacca, Faithful First Mate',
  kind: 'unit',
  aspects: ['Command', 'Heroism'],
  traits: ['Rebel', 'Wookiee', 'Pilot'],
  cost: 5,
  power: 5,
  hp: 6,
  arena: 'ground',
  unique: true,
  enemyAbilityImmunity: ['defeat', 'return-to-hand'],
  piloting: [
    {
      id: 'pilot',
      cost: 3,
      aspects: ['Command', 'Heroism'],
    },
  ],
  upgrade: {
    modifiers: {
      power: 3,
      hp: 3,
    },
    attachTo: 'friendly-vehicle-without-pilot',
    grants: {
      enemyAbilityImmunity: ['defeat', 'return-to-hand'],
    },
  },
} as const satisfies UnitDefinition;
