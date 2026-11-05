import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteEndlessLegions = {
  cardId: 'endless-legions',
  name: 'Endless Legions',
  kind: 'event',
  aspects: ['Command', 'Command'],
  traits: ['Supply'],
  cost: 14,
  effects: [
    {
      kind: 'inspect-zone',
      zone: 'resources',
      player: 'self',
      chooser: 'owner',
      filter: {},
      min: 0,
      max: {
        kind: 'zone-size',
        zone: 'resources',
        player: 'self',
      },
      bind: 'card',
      effects: [
        {
          kind: 'play-card',
          from: 'resources',
          filter: {
            kind: 'unit',
          },
          optional: false,
          group: 'revealed',
          free: true,
          repeat: true,
          replaceResource: false,
        },
      ],
      reveal: true,
      group: 'revealed',
    },
  ],
} as const satisfies EventDefinition;
