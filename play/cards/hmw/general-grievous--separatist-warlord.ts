import { hmwLeader } from './define.ts';

export const hmwGeneralGrievousSeparatistWarlord = hmwLeader(
  'general-grievous--separatist-warlord',
  {
    leader: {
      actions: [
        {
          id: 'play-two',
          requiresPlayable: true,
          costs: [
            {
              kind: 'exhaust-self',
            },
          ],
          limit: null,
          effects: [
            {
              kind: 'play-card',
              from: 'hand',
              filter: {
                kind: 'unit',
              },
              optional: false,
              requirePlay: true,
            },
            {
              kind: 'play-card',
              from: 'hand',
              filter: {
                kind: 'unit',
              },
              optional: false,
              requirePlay: true,
            },
          ],
        },
      ],
    },
    unit: {
      constant: [
        {
          condition: {
            kind: 'unit-count-comparison',
            relation: 'more',
          },
          power: 3,
        },
      ],
    },
  },
);
