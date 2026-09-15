import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 conditional ability fixture.
export const flarestarAttackShuttle = {
  cardId: 'flarestar-attack-shuttle',
  name: 'Flarestar Attack Shuttle',
  kind: 'unit',
  aspects: ['Aggression'],
  traits: ['Underworld', 'Vehicle', 'Fighter'],
  cost: 2,
  power: 2,
  hp: 1,
  arena: 'space',
  triggers: [
    {
      id: 'advantage-played',
      timing: 'played',
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
                count: 1,
              },
            },
          ],
        },
      ],
    },
    {
      id: 'advantage-defeated',
      timing: 'defeated',
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
                count: 1,
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
