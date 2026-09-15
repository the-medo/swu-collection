import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-effects.json.
export const deathField = {
  cardId: 'death-field',
  name: 'Death Field',
  kind: 'event',
  aspects: ['Aggression', 'Villainy'],
  traits: ['Force'],
  cost: 4,
  effects: [
    {
      kind: 'damage-units',
      amount: 2,
      filter: {
        controller: 'enemy',
        withoutTrait: 'Vehicle',
      },
    },
    {
      kind: 'if',
      condition: {
        kind: 'units-at-least',
        filter: {
          controller: 'friendly',
          trait: 'Force',
        },
        amount: 1,
      },
      effects: [
        {
          kind: 'draw-cards',
          amount: 1,
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
