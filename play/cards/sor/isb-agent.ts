import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-effects.json.
export const isbAgent = {
  cardId: 'isb-agent',
  name: 'ISB Agent',
  kind: 'unit',
  aspects: ['Cunning', 'Villainy'],
  traits: ['Imperial'],
  cost: 1,
  power: 1,
  hp: 3,
  arena: 'ground',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'inspect-zone',
          zone: 'hand',
          player: 'self',
          chooser: 'owner',
          filter: {
            kind: 'event',
          },
          min: 0,
          max: 1,
          bind: 'chosen',
          effects: [
            {
              kind: 'reveal-card',
              target: 'chosen',
            },
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
                    kind: 'damage',
                    amount: 1,
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
