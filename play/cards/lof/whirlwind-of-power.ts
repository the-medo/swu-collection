import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-effects.json.
export const whirlwindOfPower = {
  cardId: 'whirlwind-of-power',
  name: 'Whirlwind of Power',
  kind: 'event',
  aspects: ['Vigilance'],
  traits: ['Force'],
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
              kind: 'conditional',
              condition: {
                kind: 'units-at-least',
                filter: {
                  controller: 'friendly',
                  trait: 'Force',
                },
                amount: 1,
              },
              then: -3,
              otherwise: -2,
            },
            hp: {
              kind: 'conditional',
              condition: {
                kind: 'units-at-least',
                filter: {
                  controller: 'friendly',
                  trait: 'Force',
                },
                amount: 1,
              },
              then: -3,
              otherwise: -2,
            },
            duration: 'phase',
          },
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
