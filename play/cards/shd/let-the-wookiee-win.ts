import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteLetTheWookieeWin = {
  cardId: 'let-the-wookiee-win',
  name: 'Let the Wookiee Win',
  kind: 'event',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Trick'],
  cost: 2,
  effects: [
    {
      kind: 'choose-mode',
      options: [
        {
          id: 'resources',
          effects: [
            {
              kind: 'select-resources',
              player: 'self',
              exhausted: 'any',
              min: 0,
              max: 6,
              operation: 'ready',
            },
          ],
        },
        {
          id: 'unit',
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
                    kind: 'ready',
                  },
                },
                {
                  kind: 'if',
                  condition: {
                    kind: 'unit-matches',
                    target: 'chosen',
                    filter: {
                      trait: 'Wookiee',
                    },
                  },
                  effects: [
                    {
                      kind: 'attack-bound',
                      target: 'chosen',
                      optional: false,
                      powerBonus: 2,
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
      chooser: 'enemy',
    },
  ],
} as const satisfies EventDefinition;
