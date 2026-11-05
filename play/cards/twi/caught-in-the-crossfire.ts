import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteCaughtInTheCrossfire = {
  cardId: 'caught-in-the-crossfire',
  name: 'Caught in the Crossfire',
  kind: 'event',
  aspects: ['Aggression'],
  traits: ['Disaster'],
  cost: 6,
  effects: [
    {
      kind: 'select-unit',
      filter: {
        controller: 'enemy',
      },
      optional: false,
      bind: 'first',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'enemy',
            otherThan: 'first',
            sameArenaAs: 'first',
          },
          optional: false,
          bind: 'second',
          effects: [
            {
              kind: 'damage-assignments',
              assignments: [
                {
                  target: 'second',
                  amount: {
                    kind: 'unit-stat',
                    target: 'first',
                    stat: 'power',
                  },
                  source: 'first',
                },
                {
                  target: 'first',
                  amount: {
                    kind: 'unit-stat',
                    target: 'second',
                    stat: 'power',
                  },
                  source: 'second',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
