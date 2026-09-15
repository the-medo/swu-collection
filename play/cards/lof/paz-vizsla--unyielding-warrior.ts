import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-attributes.json.
export const pazVizslaUnyieldingWarrior = {
  cardId: 'paz-vizsla--unyielding-warrior',
  name: 'Paz Vizsla, Unyielding Warrior',
  kind: 'unit',
  aspects: ['Aggression', 'Aggression'],
  traits: ['Mandalorian'],
  unique: true,
  cost: 5,
  power: 3,
  hp: 6,
  arena: 'ground',
  constant: [
    {
      condition: {
        kind: 'always',
      },
      power: {
        kind: 'unit-sum',
        filter: {
          sameAs: 'source',
        },
        stat: 'damage',
        multiplier: 2,
      },
    },
  ],
} as const satisfies UnitDefinition;
