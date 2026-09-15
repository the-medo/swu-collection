import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-foundations.json.
export const coordinatedFront = {
  cardId: 'coordinated-front',
  name: 'Coordinated Front',
  kind: 'event',
  aspects: ['Heroism'],
  traits: ['Plan'],
  cost: 2,
  effects: [
    {
      kind: 'select-unit',
      filter: {
        arena: 'ground',
      },
      bind: 'chosen',
      optional: true,
      effects: [
        {
          kind: 'on-unit',
          target: 'chosen',
          operation: {
            kind: 'modify',
            power: 2,
            hp: 2,
            duration: 'phase',
          },
        },
      ],
    },
    {
      kind: 'select-unit',
      filter: {
        arena: 'space',
      },
      bind: 'chosen',
      optional: true,
      effects: [
        {
          kind: 'on-unit',
          target: 'chosen',
          operation: {
            kind: 'modify',
            power: 2,
            hp: 2,
            duration: 'phase',
          },
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
