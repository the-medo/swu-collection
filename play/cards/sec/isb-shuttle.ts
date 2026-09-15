import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-effects.json.
export const isbShuttle = {
  cardId: 'isb-shuttle',
  name: 'ISB Shuttle',
  kind: 'unit',
  aspects: ['Command', 'Villainy'],
  traits: ['Imperial', 'Vehicle', 'Transport'],
  cost: 3,
  power: 3,
  hp: 2,
  arena: 'space',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'create-unit',
          cardId: 'spy',
          count: 1,
        },
      ],
      condition: {
        kind: 'friendly-unit-defeated',
      },
    },
  ],
} as const satisfies UnitDefinition;
