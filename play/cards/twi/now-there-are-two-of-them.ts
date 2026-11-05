import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteNowThereAreTwoOfThem = {
  cardId: 'now-there-are-two-of-them',
  name: 'Now There Are Two of Them',
  kind: 'event',
  aspects: ['Cunning'],
  traits: ['Trick'],
  cost: 3,
  effects: [
    {
      kind: 'if',
      condition: {
        kind: 'numeric-equal',
        left: {
          kind: 'unit-count',
          filter: {
            controller: 'friendly',
          },
        },
        right: 1,
      },
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'friendly',
          },
          optional: false,
          bind: 'chosen',
          effects: [
            {
              kind: 'play-card',
              from: 'hand',
              filter: {
                kind: 'unit',
                withoutTrait: 'Vehicle',
                sharesTraitWith: 'chosen',
              },
              optional: false,
              discount: 5,
            },
          ],
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
