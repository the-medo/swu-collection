import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteChooseSides = {
  cardId: 'choose-sides',
  name: 'Choose Sides',
  kind: 'event',
  aspects: ['Command'],
  traits: ['Plan'],
  cost: 7,
  effects: [
    {
      kind: 'select-unit',
      filter: {
        controller: 'friendly',
        nonLeader: true,
      },
      optional: false,
      bind: 'friendly',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'enemy',
            nonLeader: true,
          },
          optional: false,
          bind: 'enemy',
          effects: [
            {
              kind: 'exchange-control',
              first: 'friendly',
              second: 'enemy',
              effects: [],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
