import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-effects.json.
export const inspiringSenator = {
  cardId: 'inspiring-senator',
  name: 'Inspiring Senator',
  kind: 'unit',
  aspects: [],
  traits: ['Republic', 'Official'],
  cost: 3,
  power: 3,
  hp: 3,
  arena: 'ground',
  triggers: [
    {
      id: 'defeated',
      timing: 'defeated',
      effects: [
        {
          kind: 'next-play',
          filter: {
            kind: 'unit',
            trait: 'Official',
          },
          discount: 1,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
