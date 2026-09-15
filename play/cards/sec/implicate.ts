import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-history.json.
export const implicate = {
  cardId: 'implicate',
  name: 'Implicate',
  kind: 'event',
  aspects: ['Cunning'],
  traits: ['Trick'],
  cost: 2,
  effects: [
    {
      kind: 'select-unit',
      filter: {},
      bind: 'chosen',
      optional: false,
      effects: [
        {
          kind: 'on-unit',
          target: 'chosen',
          operation: {
            kind: 'modify',
            power: 0,
            hp: 0,
            duration: 'phase',
            abilities: {
              keywords: ['Sentinel'],
              triggers: [
                {
                  id: 'attacked',
                  timing: 'attacked',
                  effects: [
                    {
                      kind: 'create-unit',
                      cardId: 'spy',
                      count: 1,
                    },
                  ],
                },
              ],
            },
          },
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
