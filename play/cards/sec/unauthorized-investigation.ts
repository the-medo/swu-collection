import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-effects.json.
export const unauthorizedInvestigation = {
  cardId: 'unauthorized-investigation',
  name: 'Unauthorized Investigation',
  kind: 'event',
  aspects: ['Aggression'],
  traits: ['Plan'],
  cost: 3,
  effects: [
    {
      kind: 'create-unit',
      cardId: 'spy',
      count: 1,
    },
    {
      kind: 'disclose',
      aspects: ['Aggression'],
      effects: [
        {
          kind: 'create-unit',
          cardId: 'spy',
          count: 1,
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
