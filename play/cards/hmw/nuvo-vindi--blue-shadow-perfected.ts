import { hmwUnit } from './define.ts';

export const hmwNuvoVindiBlueShadowPerfected = hmwUnit('nuvo-vindi--blue-shadow-perfected', {
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {},
          bind: 'chosen',
          optional: true,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'give-token',
                token: 'weakness',
                count: 1,
              },
            },
          ],
        },
      ],
    },
    {
      id: 'enemy-weakness-defeated',
      timing: 'enemy-defeated',
      condition: {
        kind: 'unit-matches',
        target: 'subject',
        filter: {
          controller: 'enemy',
          withUpgrade: 'weakness',
        },
      },
      limit: 'once-per-round',
      effects: [
        {
          kind: 'select-unit',
          filter: {},
          bind: 'chosen',
          optional: true,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'give-token',
                token: 'weakness',
                count: 1,
              },
            },
          ],
        },
      ],
    },
  ],
});
