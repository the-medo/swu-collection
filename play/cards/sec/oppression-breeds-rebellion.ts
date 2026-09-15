import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-history.json.
export const oppressionBreedsRebellion = {
  cardId: 'oppression-breeds-rebellion',
  name: 'Oppression Breeds Rebellion',
  kind: 'event',
  aspects: ['Aggression', 'Heroism'],
  traits: ['Plan'],
  cost: 3,
  effects: [
    {
      kind: 'if',
      condition: {
        kind: 'numeric-at-least',
        value: {
          kind: 'unit-history-count',
          player: 'self',
          event: 'defeated-attacking',
        },
        amount: 1,
      },
      effects: [
        {
          kind: 'draw-cards',
          amount: 3,
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
