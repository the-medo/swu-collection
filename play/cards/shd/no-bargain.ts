import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteNoBargain = {
  cardId: 'no-bargain',
  name: 'No Bargain',
  kind: 'event',
  aspects: ['Villainy'],
  traits: ['Trick'],
  cost: 3,
  effects: [
    {
      kind: 'inspect-zone',
      zone: 'hand',
      player: 'enemy',
      chooser: 'owner',
      filter: {},
      min: 1,
      max: 1,
      bind: 'card',
      effects: [
        {
          kind: 'move-card',
          target: 'card',
          from: 'hand',
          to: 'discard',
        },
      ],
    },
    {
      kind: 'draw-cards',
      amount: 1,
    },
  ],
} as const satisfies EventDefinition;
