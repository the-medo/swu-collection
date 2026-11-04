import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-foundations.json.
export const earlySetProtectorOfTheThrone = {
  cardId: 'protector-of-the-throne',
  name: 'Protector of the Throne',
  kind: 'unit',
  aspects: ['Heroism'],
  traits: ['Mandalorian'],
  cost: 3,
  power: 2,
  hp: 4,
  arena: 'ground',
  constant: [
    {
      condition: {
        kind: 'unit-matches',
        target: 'source',
        filter: {
          upgraded: true,
        },
      },
      abilities: {
        keywords: ['Sentinel'],
      },
    },
  ],
} as const satisfies UnitDefinition;
