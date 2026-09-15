import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-effects.json.
export const ferrixUprising = {
  cardId: 'ferrix-uprising',
  name: 'Ferrix Uprising',
  kind: 'event',
  aspects: ['Command'],
  traits: ['Tactic'],
  cost: 4,
  effects: [
    {
      kind: 'select-unit',
      filter: {},
      bind: 'chosen',
      optional: false,
      effects: [
        {
          kind: 'with-value',
          name: 'units',
          value: {
            kind: 'unit-count',
            filter: {
              controller: 'friendly',
              sameArenaAs: 'chosen',
            },
          },
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'damage',
                amount: {
                  kind: 'value',
                  name: 'units',
                  multiplier: 2,
                },
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
