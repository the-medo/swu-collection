import type { UnitDefinition } from '../definition.ts';

// SEC 110. Printed text is pinned in meta-play-costs fixture.
export const gnkPowerDroid = {
  cardId: 'gnk-power-droid',
  name: 'GNK Power Droid',
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Droid'],
  cost: 2,
  power: 1,
  hp: 3,
  arena: 'ground',
  triggers: [
    {
      id: 'on-attack',
      timing: 'attack',
      effects: [
        {
          kind: 'next-play',
          filter: {
            kind: 'unit',
          },
          discount: 1,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
