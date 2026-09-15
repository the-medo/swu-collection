import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-effects.json.
export const taylanderShuttle = {
  cardId: 'taylander-shuttle',
  name: 'Taylander Shuttle',
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Fringe', 'Vehicle', 'Transport'],
  cost: 3,
  power: 2,
  hp: 4,
  arena: 'space',
  triggers: [
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'create-unit',
          cardId: 'spy',
          count: 1,
        },
      ],
      condition: {
        kind: 'initiative',
      },
    },
  ],
} as const satisfies UnitDefinition;
