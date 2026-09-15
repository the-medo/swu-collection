import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-effects.json.
export const axeWovesUndaunted = {
  cardId: 'axe-woves--undaunted',
  name: 'Axe Woves, Undaunted',
  kind: 'unit',
  aspects: ['Aggression'],
  traits: ['Mandalorian'],
  unique: true,
  cost: 3,
  power: 2,
  hp: 4,
  arena: 'ground',
  triggers: [
    {
      id: 'cards-drawn',
      timing: 'cards-drawn',
      effects: [
        {
          kind: 'on-unit',
          target: 'source',
          operation: {
            kind: 'give-token',
            token: 'advantage',
            count: 1,
          },
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
