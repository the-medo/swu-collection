import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-advanced.json.
export const diplomaticPageantry = {
  cardId: 'diplomatic-pageantry',
  name: 'Diplomatic Pageantry',
  kind: 'event',
  aspects: ['Cunning'],
  traits: ['Law'],
  cost: 1,
  effects: [
    {
      kind: 'select-unit',
      filter: {
        controller: 'friendly',
      },
      optional: false,
      bind: 'ally',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'enemy',
          },
          optional: false,
          bind: 'enemy',
          effects: [
            {
              kind: 'exhaust-bound',
              targets: ['ally', 'enemy'],
              countAs: 'exhausted',
              effects: [
                {
                  kind: 'if',
                  condition: {
                    kind: 'value-at-least',
                    name: 'exhausted',
                    amount: 2,
                  },
                  effects: [
                    {
                      kind: 'on-unit',
                      target: 'ally',
                      operation: {
                        kind: 'give-token',
                        token: 'advantage',
                        count: 2,
                      },
                    },
                  ],
                },
              ],
            },
          ],
          allowMissing: true,
        },
      ],
      allowMissing: true,
    },
  ],
} as const satisfies EventDefinition;
