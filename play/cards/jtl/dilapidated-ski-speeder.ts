import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 conditional ability fixture.
export const dilapidatedSkiSpeeder = {
  cardId: 'dilapidated-ski-speeder',
  name: 'Dilapidated Ski Speeder',
  kind: 'unit',
  aspects: ['Heroism'],
  traits: ['Resistance', 'Vehicle', 'Speeder'],
  cost: 3,
  power: 3,
  hp: 7,
  arena: 'ground',
  triggers: [
    {
      id: 'self-damage',
      timing: 'played',
      effects: [
        {
          kind: 'on-unit',
          target: 'source',
          operation: {
            kind: 'damage',
            amount: 3,
          },
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
