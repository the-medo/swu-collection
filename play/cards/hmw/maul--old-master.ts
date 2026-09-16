import { hmwLeader } from './define.ts';

export const hmwMaulOldMaster = hmwLeader('maul--old-master', {
  leader: {
    actions: [
      {
        id: 'play-and-defeat',
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
            discount: 1,
            optional: false,
            bind: 'played',
            effects: [
              {
                kind: 'on-unit',
                target: 'played',
                operation: {
                  kind: 'defeat',
                },
              },
            ],
          },
        ],
      },
    ],
  },
  unit: {
    keywords: ['Shielded'],
    triggers: [
      {
        id: 'deployed',
        timing: 'deployed',
        effects: [
          {
            kind: 'play-card',
            from: 'discard',
            filter: {
              kind: 'unit',
              defeatedThisPhase: true,
            },
            discount: 5,
            optional: true,
          },
        ],
      },
    ],
  },
});
