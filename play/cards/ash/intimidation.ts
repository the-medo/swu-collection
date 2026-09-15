import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-effects.json.
export const intimidation = {
  cardId: 'intimidation',
  name: 'Intimidation',
  kind: 'event',
  aspects: ['Aggression'],
  traits: ['Innate'],
  cost: 2,
  effects: [
    {
      kind: 'if',
      condition: {
        kind: 'units-at-least',
        filter: {
          controller: 'friendly',
          powerAtLeast: 4,
        },
        amount: 1,
      },
      effects: [
        {
          kind: 'draw-cards',
          amount: 2,
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
