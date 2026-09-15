import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-effects.json.
export const eighthBrotherHuntTogether = {
  cardId: 'eighth-brother--hunt-together',
  name: 'Eighth Brother, Hunt Together',
  kind: 'unit',
  aspects: ['Command', 'Villainy'],
  traits: ['Force', 'Imperial', 'Inquisitor'],
  unique: true,
  cost: 6,
  power: 5,
  hp: 7,
  arena: 'ground',
  keywords: ['Ambush'],
  triggers: [
    {
      id: 'another-unit-played',
      timing: 'friendly-played',
      effects: [
        {
          kind: 'pay',
          costs: [
            {
              kind: 'force',
            },
          ],
          optional: true,
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
                    power: 2,
                    hp: 2,
                    duration: 'phase',
                  },
                },
              ],
            },
          ],
        },
      ],
      excludeSelf: true,
    },
  ],
} as const satisfies UnitDefinition;
