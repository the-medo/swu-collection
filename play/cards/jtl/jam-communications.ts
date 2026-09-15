import type { EventDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 effects fixture.
export const jamCommunications = {
  cardId: 'jam-communications',
  name: 'Jam Communications',
  kind: 'event',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Trick'],
  cost: 1,
  effects: [
    {
      kind: 'inspect-zone',
      zone: 'hand',
      player: 'enemy',
      chooser: 'self',
      filter: {
        kind: 'event',
      },
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
  ],
} as const satisfies EventDefinition;
