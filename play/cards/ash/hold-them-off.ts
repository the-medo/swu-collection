import type { EventDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 search/combat fixture.
export const holdThemOff = {
  cardId: 'hold-them-off',
  name: 'Hold Them Off',
  kind: 'event',
  aspects: ['Command'],
  traits: ['Tactic'],
  cost: 4,
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
          kind: 'divide-damage',
          source: 'chosen',
          amount: {
            kind: 'unit-stat',
            target: 'chosen',
            stat: 'power',
          },
          filter: {
            sameArenaAs: 'chosen',
          },
          optional: false,
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
