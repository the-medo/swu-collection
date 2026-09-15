import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-effects.json.
export const starfortressHeavyBomber = {
  cardId: 'starfortress-heavy-bomber',
  name: 'StarFortress Heavy Bomber',
  kind: 'unit',
  aspects: ['Aggression'],
  traits: ['Resistance', 'Vehicle', 'Transport'],
  cost: 5,
  power: 3,
  hp: 3,
  arena: 'space',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            arena: 'ground',
            unique: false,
          },
          optional: true,
          bind: 'chosen',
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'damage',
                amount: 6,
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
