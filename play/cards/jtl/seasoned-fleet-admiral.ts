import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 observer fixture.
export const seasonedFleetAdmiral = {
  cardId: 'seasoned-fleet-admiral',
  name: 'Seasoned Fleet Admiral',
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Rebel', "Twi'lek", 'Official'],
  cost: 2,
  power: 1,
  hp: 4,
  arena: 'ground',
  raid: 1,
  triggers: [
    {
      id: 'enemy-draw',
      timing: 'enemy-cards-drawn',
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
                token: 'experience',
                count: 1,
              },
            },
          ],
        },
      ],
      condition: {
        kind: 'phase',
        phase: 'action',
      },
    },
  ],
} as const satisfies UnitDefinition;
