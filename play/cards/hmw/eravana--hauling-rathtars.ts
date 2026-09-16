import { hmwUnit } from './define.ts';

export const hmwEravanaHaulingRathtars = hmwUnit('eravana--hauling-rathtars', {
  triggers: [
    {
      id: 'attack',
      timing: 'attack',
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
                kind: 'ready',
              },
            },
          ],
        },
      ],
    },
  ],
});
