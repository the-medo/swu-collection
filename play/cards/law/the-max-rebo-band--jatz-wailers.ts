import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 token/effect fixture.
export const theMaxReboBandJatzWailers = {
  cardId: 'the-max-rebo-band--jatz-wailers',
  name: 'The Max Rebo Band, Jatz-Wailers',
  kind: 'unit',
  aspects: ['Command', 'Cunning'],
  traits: ['Underworld', 'Musician'],
  unique: true,
  cost: 3,
  power: 1,
  hp: 5,
  arena: 'ground',
  triggers: [
    {
      id: 'regroup-credit',
      timing: 'regroup-start',
      effects: [
        {
          kind: 'create-credits',
          amount: 1,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
