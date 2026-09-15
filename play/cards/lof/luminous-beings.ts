import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-finale.json.
export const luminousBeings = {
  cardId: 'luminous-beings',
  name: 'Luminous Beings',
  kind: 'event',
  aspects: ['Command', 'Heroism'],
  traits: ['Force'],
  cost: 6,
  effects: [
    {
      kind: 'inspect-zone',
      zone: 'discard',
      player: 'self',
      chooser: 'self',
      filter: {
        kind: 'unit',
        trait: 'Force',
      },
      min: 0,
      max: 3,
      group: 'returned',
      bind: 'returned',
      effects: [
        {
          kind: 'bottom-deck-group',
          group: 'returned',
          from: 'discard',
          countAs: 'returned-count',
          effects: [
            {
              kind: 'select-units',
              filter: {},
              min: {
                kind: 'value',
                name: 'returned-count',
              },
              max: {
                kind: 'value',
                name: 'returned-count',
              },
              bind: 'boosted',
              effects: [
                {
                  kind: 'modify-units',
                  filter: {
                    inGroup: 'boosted',
                  },
                  operation: {
                    kind: 'modify',
                    power: 4,
                    hp: 4,
                    duration: 'phase',
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
