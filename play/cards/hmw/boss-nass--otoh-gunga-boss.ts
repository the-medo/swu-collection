import { hmwUnit } from './define.ts';

export const hmwBossNassOtohGungaBoss = hmwUnit('boss-nass--otoh-gunga-boss', {
  triggers: [
    {
      id: 'played-shield-beast',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'friendly',
            trait: 'Gungan',
            withUpgrade: 'shield',
          },
          bind: 'gungan',
          optional: true,
          effects: [
            {
              kind: 'select-upgrades',
              filter: {
                attachedTo: 'gungan',
                cardId: 'shield',
              },
              min: 1,
              max: 1,
              bind: 'shield',
              effects: [
                {
                  kind: 'move-upgrades',
                  group: 'shield',
                  to: 'discard',
                  effects: [
                    {
                      kind: 'create-unit',
                      cardId: 'beast',
                      count: 1,
                      bind: 'beast',
                      effects: [
                        {
                          kind: 'on-unit',
                          target: 'beast',
                          operation: {
                            kind: 'give-token',
                            token: 'shield',
                            count: 1,
                          },
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
    },
    {
      id: 'attack-shield-beast',
      timing: 'attack',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'friendly',
            trait: 'Gungan',
            withUpgrade: 'shield',
          },
          bind: 'gungan',
          optional: true,
          effects: [
            {
              kind: 'select-upgrades',
              filter: {
                attachedTo: 'gungan',
                cardId: 'shield',
              },
              min: 1,
              max: 1,
              bind: 'shield',
              effects: [
                {
                  kind: 'move-upgrades',
                  group: 'shield',
                  to: 'discard',
                  effects: [
                    {
                      kind: 'create-unit',
                      cardId: 'beast',
                      count: 1,
                      bind: 'beast',
                      effects: [
                        {
                          kind: 'on-unit',
                          target: 'beast',
                          operation: {
                            kind: 'give-token',
                            token: 'shield',
                            count: 1,
                          },
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
    },
  ],
});
