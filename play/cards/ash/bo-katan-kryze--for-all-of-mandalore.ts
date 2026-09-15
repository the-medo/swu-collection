import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-foundations.json.
export const boKatanKryzeForAllOfMandalore = {
  cardId: 'bo-katan-kryze--for-all-of-mandalore',
  name: 'Bo-Katan Kryze, For All of Mandalore',
  kind: 'unit',
  aspects: ['Command', 'Heroism'],
  traits: ['Mandalorian'],
  unique: true,
  cost: 2,
  power: 2,
  hp: 4,
  arena: 'ground',
  constant: [
    {
      condition: {
        kind: 'units-at-least',
        filter: {
          controller: 'friendly',
          trait: 'Mandalorian',
          otherThan: 'source',
        },
        amount: 1,
      },
      abilities: {
        raid: 2,
      },
    },
  ],
} as const satisfies UnitDefinition;
