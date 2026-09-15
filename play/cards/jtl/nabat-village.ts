import type { BaseDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 Nabat Village fixture.
export const nabatVillage = {
  cardId: 'nabat-village',
  name: 'Nabat Village',
  kind: 'base',
  aspects: ['Cunning'],
  traits: [],
  hp: 27,
  startingHandIncrease: 3,
  cannotMulligan: true,
  triggers: [
    {
      id: 'first-hand-bottom',
      timing: 'action-start',
      effects: [
        {
          kind: 'inspect-zone',
          zone: 'hand',
          player: 'self',
          chooser: 'self',
          filter: {},
          min: 3,
          max: 3,
          bind: 'chosen',
          group: 'bottom-cards',
          effects: [
            {
              kind: 'bottom-hand',
              group: 'bottom-cards',
            },
          ],
        },
      ],
      condition: {
        kind: 'round',
        number: 1,
      },
    },
  ],
} as const satisfies BaseDefinition;
