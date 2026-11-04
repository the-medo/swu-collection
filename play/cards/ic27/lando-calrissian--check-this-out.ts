import { ic27Unit } from './define.ts';

export const ic27LandoCalrissianCheckThisOut = ic27Unit('lando-calrissian--check-this-out', {
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'inspect-zone',
          zone: 'resources',
          player: 'self',
          chooser: 'self',
          filter: {},
          min: 3,
          max: 3,
          bind: 'chosen',
          effects: [
            {
              kind: 'move-cards',
              group: 'resources',
              from: 'resources',
              to: 'hand',
            },
          ],
          group: 'resources',
        },
        {
          kind: 'inspect-zone',
          zone: 'hand',
          player: 'self',
          chooser: 'self',
          filter: {},
          min: 0,
          max: 3,
          bind: 'chosen',
          effects: [
            {
              kind: 'resource-cards',
              group: 'new-resources',
              ready: false,
              countAs: 'resourced',
              effects: [],
            },
          ],
          group: 'new-resources',
        },
      ],
    },
  ],
});
