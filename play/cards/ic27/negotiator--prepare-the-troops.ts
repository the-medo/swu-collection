import { ic27Unit } from './define.ts';

export const ic27NegotiatorPrepareTheTroops = ic27Unit('negotiator--prepare-the-troops', {
  keywords: ['Sentinel'],
  triggers: [
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'resource-top',
          optional: false,
        },
        {
          kind: 'inspect-zone',
          zone: 'resources',
          player: 'self',
          chooser: 'self',
          filter: {},
          min: 0,
          max: 1,
          bind: 'chosen',
          effects: [
            {
              kind: 'move-card',
              target: 'chosen',
              from: 'resources',
              to: 'hand',
            },
          ],
        },
      ],
    },
    {
      id: 'defeated',
      timing: 'defeated',
      effects: [
        {
          kind: 'resource-top',
          optional: false,
        },
        {
          kind: 'inspect-zone',
          zone: 'resources',
          player: 'self',
          chooser: 'self',
          filter: {},
          min: 0,
          max: 1,
          bind: 'chosen',
          effects: [
            {
              kind: 'move-card',
              target: 'chosen',
              from: 'resources',
              to: 'hand',
            },
          ],
        },
      ],
    },
  ],
});
