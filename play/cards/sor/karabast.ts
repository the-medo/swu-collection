import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteKarabast = {
  cardId: 'karabast',
  name: 'Karabast',
  kind: 'event',
  aspects: ['Aggression', 'Heroism'],
  traits: ['Spectre'],
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
          kind: 'select-unit',
          filter: {
            controller: 'enemy',
          },
          optional: false,
          bind: 'victim',
          effects: [
            {
              kind: 'damage-target',
              target: 'victim',
              amount: {
                kind: 'difference',
                left: {
                  kind: 'unit-stat',
                  target: 'chosen',
                  stat: 'damage',
                },
                right: -1,
              },
              source: 'chosen',
            },
          ],
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
