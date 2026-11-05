import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteDaughterOfDathomir = {
  cardId: 'daughter-of-dathomir',
  name: 'Daughter of Dathomir',
  kind: 'unit',
  aspects: ['Vigilance'],
  traits: ['Force', 'Night'],
  cost: 4,
  power: 3,
  hp: 5,
  arena: 'ground',
  constant: [
    {
      condition: {
        kind: 'unit-matches',
        target: 'source',
        filter: {
          damaged: false,
        },
      },
      restore: 2,
    },
  ],
} as const satisfies UnitDefinition;
