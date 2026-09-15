import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-effects.json.
export const khetannaUponTheDuneSea = {
  cardId: 'khetanna--upon-the-dune-sea',
  name: 'Khetanna, Upon the Dune Sea',
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Underworld', 'Vehicle', 'Speeder'],
  unique: true,
  cost: 3,
  power: 2,
  hp: 4,
  arena: 'ground',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'next-play',
          filter: {
            kind: 'unit',
            trait: 'Underworld',
          },
          discount: 1,
        },
      ],
    },
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'next-play',
          filter: {
            kind: 'unit',
            trait: 'Underworld',
          },
          discount: 1,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
