import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-effects.json.
export const chooseYourPath = {
  cardId: 'choose-your-path',
  name: 'Choose Your Path',
  kind: 'event',
  aspects: ['Heroism'],
  traits: ['Force', 'Mandalorian'],
  cost: 2,
  effects: [
    {
      kind: 'choose-mode',
      options: [
        {
          id: 'heal-base',
          effects: [
            {
              kind: 'if',
              condition: {
                kind: 'units-at-least',
                filter: {
                  controller: 'friendly',
                  trait: 'Force',
                },
                amount: 1,
              },
              effects: [
                {
                  kind: 'heal-own-base',
                  amount: 5,
                },
              ],
            },
          ],
        },
        {
          id: 'create-mandalorian',
          effects: [
            {
              kind: 'if',
              condition: {
                kind: 'units-at-least',
                filter: {
                  controller: 'friendly',
                  trait: 'Mandalorian',
                },
                amount: 1,
              },
              effects: [
                {
                  kind: 'create-unit',
                  cardId: 'mandalorian',
                  count: 1,
                  bind: 'created',
                  effects: [
                    {
                      kind: 'on-unit',
                      target: 'created',
                      operation: {
                        kind: 'give-token',
                        token: 'advantage',
                        count: 1,
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
