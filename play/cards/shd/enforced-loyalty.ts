import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteEnforcedLoyalty = {
  cardId: 'enforced-loyalty',
  name: 'Enforced Loyalty',
  kind: 'event',
  aspects: ['Command', 'Command'],
  traits: ['Law'],
  cost: 2,
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
          kind: 'on-unit',
          target: 'chosen',
          operation: {
            kind: 'defeat',
          },
          ifYouDo: [
            {
              kind: 'draw-cards',
              amount: 2,
            },
          ],
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
