import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteChangeOfHeart = {
  cardId: 'change-of-heart',
  name: 'Change of Heart',
  kind: 'event',
  aspects: ['Cunning'],
  traits: ['Gambit'],
  cost: 6,
  effects: [
    {
      kind: 'select-unit',
      filter: {
        nonLeader: true,
      },
      optional: false,
      bind: 'chosen',
      effects: [
        {
          kind: 'on-unit',
          target: 'chosen',
          operation: {
            kind: 'take-control',
            player: 'self',
            returnWhen: 'regroup',
          },
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
