import { hmwUnit } from './define.ts';

export const hmwImaGunDiHoldingOutForResupply = hmwUnit('ima-gun-di--holding-out-for-resupply', {
  triggers: [
    {
      id: 'defeated',
      timing: 'defeated',
      condition: {
        kind: 'fewer-resources-than-opponent',
      },
      effects: [
        {
          kind: 'inspect-zone',
          zone: 'hand',
          player: 'self',
          chooser: 'self',
          filter: {},
          min: 0,
          max: 1,
          bind: 'resource',
          effects: [
            {
              kind: 'resource-cards',
              group: 'resource',
              ready: false,
              countAs: 'resourced',
              effects: [
                {
                  kind: 'if',
                  condition: {
                    kind: 'value-at-least',
                    name: 'resourced',
                    amount: 1,
                  },
                  effects: [
                    {
                      kind: 'resource-top',
                      optional: false,
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
});
