import type { EventDefinition } from '../definition.ts';

// LAW 217. Printed text is pinned in meta-hidden-zones fixture.
export const holdForQuestioning = {
  cardId: 'hold-for-questioning',
  name: 'Hold For Questioning',
  kind: 'event',
  aspects: ['Cunning', 'Villainy'],
  traits: ['Law'],
  cost: 3,
  effects: [
    {
      kind: 'select-unit',
      filter: {
        controller: 'enemy',
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
              kind: 'inspect-zone',
              zone: 'hand',
              player: 'enemy',
              chooser: 'self',
              filter: {
                sharesAspectWith: 'chosen',
              },
              min: 1,
              max: 1,
              bind: 'chosen-card',
              effects: [
                {
                  kind: 'move-card',
                  target: 'chosen-card',
                  from: 'hand',
                  to: 'discard',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
