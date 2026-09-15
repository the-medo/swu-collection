import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 token/effect fixture.
export const cantoBightSecurity = {
  cardId: 'canto-bight-security',
  name: 'Canto Bight Security',
  kind: 'unit',
  aspects: ['Vigilance'],
  traits: ['Fringe'],
  cost: 5,
  power: 3,
  hp: 5,
  arena: 'ground',
  keywords: ['Sentinel'],
  triggers: [
    {
      id: 'defense-credit',
      timing: 'attacked',
      effects: [
        {
          kind: 'create-credits',
          amount: 1,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
