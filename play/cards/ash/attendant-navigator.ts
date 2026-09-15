import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-effects.json.
export const attendantNavigator = {
  cardId: 'attendant-navigator',
  name: 'Attendant Navigator',
  kind: 'unit',
  aspects: ['Villainy'],
  traits: ['First Order'],
  cost: 2,
  power: 2,
  hp: 3,
  arena: 'ground',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            arena: 'space',
          },
          optional: true,
          bind: 'chosen',
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'give-token',
                token: 'advantage',
                count: 2,
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
