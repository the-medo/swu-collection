import type { EventDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 control and timing fixture.
export const timeOfCrisis = {
  cardId: 'time-of-crisis',
  name: 'Time of Crisis',
  kind: 'event',
  aspects: ['Aggression'],
  traits: ['Disaster'],
  cost: 4,
  effects: [
    {
      kind: 'select-unit',
      filter: {
        controller: 'friendly',
      },
      optional: false,
      bind: 'self-spared',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'enemy',
          },
          optional: false,
          bind: 'enemy-spared',
          effects: [
            {
              kind: 'damage-units',
              amount: 3,
              filter: {
                otherThanAny: ['self-spared', 'enemy-spared'],
              },
            },
          ],
          chooser: 'enemy',
          allowMissing: true,
        },
      ],
      allowMissing: true,
    },
  ],
} as const satisfies EventDefinition;
