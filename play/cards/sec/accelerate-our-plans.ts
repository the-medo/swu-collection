import type { EventDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 token/effect fixture.
export const accelerateOurPlans = {
  cardId: 'accelerate-our-plans',
  name: 'Accelerate Our Plans',
  kind: 'event',
  aspects: ['Cunning'],
  traits: ['Plan'],
  cost: 1,
  effects: [
    {
      kind: 'select-unit',
      filter: {
        controller: 'friendly',
      },
      bind: 'chosen',
      optional: false,
      effects: [
        {
          kind: 'on-unit',
          target: 'chosen',
          operation: {
            kind: 'exhaust',
          },
          ifYouDo: [
            {
              kind: 'attack-with-unit',
              filter: {
                otherThan: 'chosen',
              },
              powerBonus: 3,
            },
          ],
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
