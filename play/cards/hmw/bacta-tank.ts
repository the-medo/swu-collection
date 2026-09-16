import { hmwUpgrade } from './define.ts';

export const hmwBactaTank = hmwUpgrade('bacta-tank', {
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            withoutTrait: 'Vehicle',
            damaged: true,
          },
          bind: 'chosen',
          optional: true,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'heal',
                amount: 3,
              },
            },
          ],
        },
      ],
    },
  ],
  actions: [
    {
      id: 'recover-unit',
      costs: [
        {
          kind: 'defeat-self',
        },
      ],
      limit: null,
      effects: [
        {
          kind: 'inspect-zone',
          zone: 'discard',
          player: 'self',
          chooser: 'self',
          filter: {
            kind: 'unit',
            withoutTrait: 'Vehicle',
          },
          min: 1,
          max: 1,
          bind: 'chosen',
          effects: [
            {
              kind: 'move-card',
              target: 'chosen',
              from: 'discard',
              to: 'deck-top',
            },
          ],
        },
      ],
    },
  ],
});
