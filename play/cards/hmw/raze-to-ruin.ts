import { hmwEvent } from './define.ts';

export const hmwRazeToRuin = hmwEvent('raze-to-ruin', [
  {
    kind: 'inspect-zone',
    zone: 'hand',
    player: 'self',
    chooser: 'owner',
    filter: {},
    min: {
      kind: 'difference',
      left: {
        kind: 'zone-size',
        zone: 'hand',
        player: 'self',
      },
      right: 3,
    },
    max: {
      kind: 'difference',
      left: {
        kind: 'zone-size',
        zone: 'hand',
        player: 'self',
      },
      right: 3,
    },
    bind: 'own',
    effects: [
      {
        kind: 'move-cards',
        group: 'own',
        from: 'hand',
        to: 'discard',
        discardBy: 'owner',
      },
    ],
    after: [
      {
        kind: 'inspect-zone',
        zone: 'hand',
        player: 'enemy',
        chooser: 'owner',
        filter: {},
        min: {
          kind: 'difference',
          left: {
            kind: 'zone-size',
            zone: 'hand',
            player: 'enemy',
          },
          right: 3,
        },
        max: {
          kind: 'difference',
          left: {
            kind: 'zone-size',
            zone: 'hand',
            player: 'enemy',
          },
          right: 3,
        },
        bind: 'enemy',
        effects: [
          {
            kind: 'move-cards',
            group: 'enemy',
            from: 'hand',
            to: 'discard',
            discardBy: 'owner',
          },
        ],
      },
    ],
  },
]);
