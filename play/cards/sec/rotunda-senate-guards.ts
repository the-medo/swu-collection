import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-foundations.json.
export const rotundaSenateGuards = {
  cardId: 'rotunda-senate-guards',
  name: 'Rotunda Senate Guards',
  kind: 'unit',
  aspects: ['Vigilance'],
  traits: ['Republic', 'Trooper'],
  cost: 4,
  power: 4,
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
      abilities: {
        keywords: ['Sentinel'],
      },
    },
  ],
} as const satisfies UnitDefinition;
