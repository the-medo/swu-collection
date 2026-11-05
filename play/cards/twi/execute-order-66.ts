import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteExecuteOrder66 = {
  cardId: 'execute-order-66',
  name: 'Execute Order 66',
  kind: 'event',
  aspects: ['Villainy'],
  traits: ['Plan'],
  cost: 4,
  effects: [
    {
      kind: 'damage-units',
      filter: {
        trait: 'Jedi',
      },
      amount: 6,
      after: [
        {
          kind: 'with-value',
          name: 'friendly-defeated',
          value: {
            kind: 'group-defeated-count',
            group: 'damaged-units',
            controller: 'self',
          },
          effects: [
            {
              kind: 'with-value',
              name: 'enemy-defeated',
              value: {
                kind: 'group-defeated-count',
                group: 'damaged-units',
                controller: 'enemy',
              },
              effects: [
                {
                  kind: 'create-unit',
                  cardId: 'clone-trooper',
                  count: {
                    kind: 'value',
                    name: 'friendly-defeated',
                  },
                },
                {
                  kind: 'create-unit',
                  cardId: 'clone-trooper',
                  count: {
                    kind: 'value',
                    name: 'enemy-defeated',
                  },
                  player: 'enemy',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
