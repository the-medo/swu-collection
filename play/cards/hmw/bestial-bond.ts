import { hmwUpgrade } from './define.ts';

export const hmwBestialBond = hmwUpgrade('bestial-bond', {
  triggers: [
    {
      id: 'played',
      timing: 'played',
      condition: {
        kind: 'unit-matches',
        target: 'attached',
        filter: {
          anyTrait: ['Creature', 'Force'],
        },
      },
      effects: [
        {
          kind: 'create-unit',
          cardId: 'beast',
          count: 1,
        },
      ],
    },
  ],
});
