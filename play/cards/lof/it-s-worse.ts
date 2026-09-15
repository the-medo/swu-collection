import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-effects.json.
export const itSWorse = {
  cardId: 'it-s-worse',
  name: "It's Worse",
  kind: 'event',
  aspects: [],
  traits: ['Trick'],
  cost: 7,
  effects: [
    {
      kind: 'defeat-unit',
      filter: {
        nonLeader: true,
      },
      optional: false,
    },
  ],
} as const satisfies EventDefinition;
