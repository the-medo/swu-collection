import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-effects.json.
export const renewedFriendship = {
  cardId: 'renewed-friendship',
  name: 'Renewed Friendship',
  kind: 'event',
  aspects: ['Command', 'Heroism'],
  traits: ['Innate'],
  cost: 4,
  effects: [
    {
      kind: 'inspect-zone',
      zone: 'discard',
      player: 'self',
      chooser: 'owner',
      filter: {
        kind: 'unit',
      },
      min: 1,
      max: 1,
      bind: 'chosen',
      effects: [
        {
          kind: 'move-card',
          target: 'chosen',
          from: 'discard',
          to: 'hand',
        },
      ],
    },
    {
      kind: 'create-unit',
      cardId: 'spy',
      count: 2,
    },
  ],
} as const satisfies EventDefinition;
