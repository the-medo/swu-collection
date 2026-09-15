import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-effects.json.
export const kreiaSWhispers = {
  cardId: 'kreia-s-whispers',
  name: "Kreia's Whispers",
  kind: 'event',
  aspects: ['Cunning'],
  traits: ['Force', 'Learned'],
  cost: 2,
  effects: [
    {
      kind: 'draw-cards',
      amount: 3,
    },
    {
      kind: 'inspect-zone',
      zone: 'hand',
      player: 'self',
      chooser: 'owner',
      filter: {},
      min: 1,
      max: 1,
      bind: 'chosen',
      effects: [
        {
          kind: 'move-card',
          target: 'chosen',
          from: 'hand',
          to: 'deck-top',
        },
      ],
    },
    {
      kind: 'inspect-zone',
      zone: 'hand',
      player: 'self',
      chooser: 'owner',
      filter: {},
      min: 1,
      max: 1,
      bind: 'chosen',
      effects: [
        {
          kind: 'move-card',
          target: 'chosen',
          from: 'hand',
          to: 'deck-bottom',
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
