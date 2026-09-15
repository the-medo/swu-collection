import type { UnitDefinition } from '../definition.ts';

// SEC 098. Printed text and rulings are pinned in meta-disclose fixture.
export const captainTyphoAllNecessaryPrecautions = {
  cardId: 'captain-typho--all-necessary-precautions',
  name: 'Captain Typho, All Necessary Precautions',
  kind: 'unit',
  aspects: ['Command', 'Heroism'],
  traits: ['Naboo', 'Republic', 'Trooper'],
  cost: 4,
  power: 4,
  hp: 5,
  arena: 'ground',
  unique: true,
  keywords: ['Sentinel'],
  triggers: [
    {
      id: 'on-attacked',
      timing: 'attacked',
      effects: [
        {
          kind: 'disclose',
          aspects: ['Command', 'Heroism'],
          effects: [
            {
              kind: 'heal-own-base',
              amount: 1,
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
