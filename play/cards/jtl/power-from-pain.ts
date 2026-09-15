import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-foundations.json.
export const powerFromPain = {
  cardId: 'power-from-pain',
  name: 'Power from Pain',
  kind: 'event',
  aspects: ['Vigilance', 'Villainy'],
  traits: ['Tactic'],
  cost: 3,
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
            power: {
              kind: 'unit-sum',
              filter: {
                sameAs: 'chosen',
              },
              stat: 'damage',
            },
            hp: 0,
            duration: 'phase',
          },
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
