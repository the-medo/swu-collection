import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 token/effect fixture.
export const haloNotAccordingToPlan = {
  cardId: 'halo--not-according-to-plan',
  name: 'Halo, Not According to Plan',
  kind: 'unit',
  aspects: ['Cunning'],
  traits: ['Underworld', 'Vehicle', 'Transport'],
  unique: true,
  cost: 5,
  power: 4,
  hp: 4,
  arena: 'space',
  keywords: ['Support'],
  triggers: [
    {
      id: 'defeat-shield',
      timing: 'attack-ended',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'value-at-least',
            name: 'defender-defeated',
            amount: 1,
          },
          effects: [
            {
              kind: 'on-unit',
              target: 'source',
              operation: {
                kind: 'give-token',
                token: 'shield',
                count: 1,
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
