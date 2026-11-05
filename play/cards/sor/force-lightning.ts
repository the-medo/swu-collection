import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteForceLightning = {
  cardId: 'force-lightning',
  name: 'Force Lightning',
  kind: 'event',
  aspects: ['Aggression', 'Villainy'],
  traits: ['Force'],
  cost: 1,
  effects: [
    {
      kind: 'select-unit',
      filter: {},
      optional: false,
      bind: 'chosen',
      effects: [
        {
          kind: 'on-unit',
          target: 'chosen',
          operation: {
            kind: 'modify',
            power: 0,
            hp: 0,
            duration: 'phase',
            loseAbilities: true,
          },
        },
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
              kind: 'select-resources',
              player: 'self',
              exhausted: false,
              min: 0,
              max: 'all',
              operation: 'exhaust',
              countAs: 'paid',
              effects: [
                {
                  kind: 'damage-target',
                  target: 'chosen',
                  amount: {
                    kind: 'value',
                    name: 'paid',
                    multiplier: 2,
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
