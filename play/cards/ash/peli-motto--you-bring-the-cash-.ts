import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-effects.json.
export const peliMottoYouBringTheCash = {
  cardId: 'peli-motto--you-bring-the-cash-',
  name: 'Peli Motto, You Bring the Cash?',
  kind: 'unit',
  aspects: ['Cunning'],
  traits: ['Fringe'],
  unique: true,
  cost: 1,
  power: 1,
  hp: 1,
  arena: 'ground',
  keywords: ['Shielded'],
  ignoreAspectPenalties: [
    {
      filter: {
        notKind: 'unit',
      },
      condition: {
        kind: 'not',
        condition: {
          kind: 'played-card-this-phase',
          filter: {
            notKind: 'unit',
          },
        },
      },
    },
  ],
} as const satisfies UnitDefinition;
