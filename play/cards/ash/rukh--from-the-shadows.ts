import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-effects.json.
export const rukhFromTheShadows = {
  cardId: 'rukh--from-the-shadows',
  name: 'Rukh, From the Shadows',
  kind: 'unit',
  aspects: ['Command', 'Cunning', 'Villainy'],
  traits: ['Imperial'],
  unique: true,
  cost: 3,
  power: 1,
  hp: 5,
  arena: 'ground',
  keywords: ['Support'],
  triggers: [
    {
      id: 'attack-ended',
      timing: 'attack-ended',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'unit-defeated',
            target: 'defender',
          },
          effects: [
            {
              kind: 'select-unit',
              filter: {},
              optional: true,
              bind: 'chosen',
              effects: [
                {
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'give-token',
                    token: 'advantage',
                    count: 3,
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
