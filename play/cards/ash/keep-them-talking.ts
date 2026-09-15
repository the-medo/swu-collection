import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-effects.json.
export const keepThemTalking = {
  cardId: 'keep-them-talking',
  name: 'Keep Them Talking',
  kind: 'event',
  aspects: ['Cunning'],
  traits: ['Trick'],
  cost: 2,
  effects: [
    {
      kind: 'select-units',
      filter: {
        maxCost: 3,
      },
      max: 2,
      bind: 'targets',
      effects: [
        {
          kind: 'each-unit',
          filter: {
            inGroup: 'targets',
          },
          bind: 'chosen',
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'exhaust',
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
