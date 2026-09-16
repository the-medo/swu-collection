import { hmwLeader } from './define.ts';

export const hmwTheWarriorDeftDuelist = hmwLeader('the-warrior--deft-duelist', {
  leader: {
    actions: [
      {
        id: 'play-unit',
        requiresPlayable: true,
        costs: [
          {
            kind: 'resources',
            amount: 1,
          },
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
              maxPower: 3,
            },
            optional: false,
            phaseAbilities: {
              keywords: ['Ambush'],
            },
          },
        ],
      },
    ],
  },
  unit: {
    keywords: ['Ambush'],
    raid: 1,
  },
});
