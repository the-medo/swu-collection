import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-phase.json.
export const fatefulGoodbye = {
  cardId: 'fateful-goodbye',
  name: 'Fateful Goodbye',
  kind: 'event',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Innate'],
  cost: 2,
  effects: [
    {
      kind: 'if',
      condition: {
        kind: 'unit-history-at-least',
        event: 'left',
        player: 'self',
        amount: 1,
      },
      effects: [
        {
          kind: 'distribute',
          benefit: 'advantage',
          exact: true,
          amount: {
            kind: 'conditional',
            condition: {
              kind: 'unit-history-at-least',
              event: 'left',
              player: 'self',
              amount: 1,
              leader: true,
            },
            then: 5,
            otherwise: 3,
          },
          filter: {
            controller: 'friendly',
          },
          bind: 'count',
          effects: [],
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
