import { hmwUnit } from './define.ts';

export const hmwKrrsantanSanto = hmwUnit('krrsantan--santo', {
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            arena: 'ground',
          },
          bind: 'chosen',
          optional: true,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'damage',
                amount: {
                  kind: 'difference',
                  left: {
                    kind: 'zone-size',
                    zone: 'resources',
                    player: 'self',
                  },
                  right: 3,
                },
              },
            },
          ],
        },
      ],
    },
  ],
});
