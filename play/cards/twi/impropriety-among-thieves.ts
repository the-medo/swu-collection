import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteImproprietyAmongThieves = {
  cardId: 'impropriety-among-thieves',
  name: 'Impropriety Among Thieves',
  kind: 'event',
  aspects: ['Cunning', 'Cunning'],
  traits: ['Trick'],
  cost: 4,
  effects: [
    {
      kind: 'select-unit',
      filter: {
        controller: 'friendly',
        nonLeader: true,
        exhausted: false,
      },
      optional: false,
      bind: 'first',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'enemy',
            nonLeader: true,
            exhausted: false,
          },
          optional: false,
          bind: 'second',
          effects: [
            {
              kind: 'exchange-control',
              first: 'first',
              second: 'second',
              returnAtRegroup: true,
              effects: [],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
