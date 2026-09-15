import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-advanced.json.
export const tatooineRepulsorTrain = {
  cardId: 'tatooine-repulsor-train',
  name: 'Tatooine Repulsor Train',
  kind: 'unit',
  aspects: ['Command', 'Aggression'],
  traits: ['Underworld', 'Vehicle', 'Speeder'],
  cost: 7,
  power: 8,
  hp: 7,
  arena: 'ground',
  protectFromAttackUnlessSentinel: [
    {
      sameAs: 'source',
      condition: {
        kind: 'units-at-least',
        filter: {
          controller: 'friendly',
          exhausted: true,
        },
        amount: 2,
      },
    },
  ],
  triggers: [
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'with-value',
          name: 'exhausted',
          value: {
            kind: 'unit-count',
            filter: {
              controller: 'friendly',
              exhausted: true,
            },
          },
          effects: [
            {
              kind: 'select-unit',
              filter: {
                arena: 'ground',
              },
              optional: false,
              bind: 'chosen',
              effects: [
                {
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'damage',
                    amount: {
                      kind: 'value',
                      name: 'exhausted',
                      multiplier: 2,
                    },
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
