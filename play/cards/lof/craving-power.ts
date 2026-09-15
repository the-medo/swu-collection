import type { UpgradeDefinition } from '../definition.ts';

// LOF 091. Printed text is pinned in the meta token fixture.
export const cravingPower = {
  cardId: 'craving-power',
  name: 'Craving Power',
  kind: 'upgrade',
  aspects: ['Command', 'Villainy'],
  traits: ['Innate'],
  cost: 5,
  token: false,
  modifiers: {
    power: 2,
    hp: 2,
  },
  attachTo: 'friendly-unit',
  triggers: [
    {
      id: 'on-played',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          bind: 'chosen',
          filter: {
            controller: 'enemy',
          },
          optional: false,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'damage',
                amount: {
                  kind: 'unit-stat',
                  target: 'attached',
                  stat: 'power',
                },
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UpgradeDefinition;
