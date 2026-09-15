import type { EventDefinition } from '../definition.ts';

// ASH 163. Printed text is pinned in meta-hidden-zones fixture.
export const recklessSacrifice = {
  cardId: 'reckless-sacrifice',
  name: 'Reckless Sacrifice',
  kind: 'event',
  aspects: ['Aggression', 'Heroism'],
  traits: ['Gambit'],
  cost: 2,
  effects: [
    {
      kind: 'inspect-zone',
      zone: 'hand',
      player: 'self',
      chooser: 'owner',
      filter: {
        kind: 'unit',
      },
      min: 1,
      max: 1,
      bind: 'chosen-card',
      effects: [
        {
          kind: 'move-card',
          target: 'chosen-card',
          from: 'hand',
          to: 'discard',
          effects: [
            {
              kind: 'select-unit',
              filter: {
                costGreaterThan: 'chosen-card',
              },
              bind: 'chosen',
              optional: false,
              effects: [
                {
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'damage',
                    amount: 5,
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
