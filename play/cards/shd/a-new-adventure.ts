import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteANewAdventure = {
  cardId: 'a-new-adventure',
  name: 'A New Adventure',
  kind: 'event',
  aspects: ['Cunning', 'Cunning'],
  traits: ['Gambit'],
  cost: 2,
  effects: [
    {
      kind: 'select-unit',
      filter: {
        nonLeader: true,
        maxCost: 6,
      },
      optional: false,
      bind: 'chosen',
      effects: [
        {
          kind: 'on-unit',
          target: 'chosen',
          operation: {
            kind: 'return-to-hand',
          },
        },
        {
          kind: 'play-card',
          from: 'hand',
          filter: {
            kind: 'unit',
          },
          optional: true,
          target: 'chosen',
          player: 'owner',
          free: true,
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
