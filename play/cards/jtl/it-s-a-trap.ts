import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-effects.json.
export const itSATrap = {
  cardId: 'it-s-a-trap',
  name: "It's a Trap",
  kind: 'event',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Gambit'],
  cost: 3,
  effects: [
    {
      kind: 'if',
      condition: {
        kind: 'opponent-has-more-units',
        arena: 'space',
      },
      effects: [
        {
          kind: 'ready-units',
          filter: {
            controller: 'friendly',
            arena: 'space',
          },
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
