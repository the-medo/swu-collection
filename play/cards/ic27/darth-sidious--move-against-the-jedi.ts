import { ic27Unit } from './define.ts';

export const ic27DarthSidiousMoveAgainstTheJedi = ic27Unit('darth-sidious--move-against-the-jedi', {
  restore: 3,
  triggers: [
    {
      id: 'own-base-healed',
      timing: 'own-base-healed',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'enemy',
          },
          bind: 'chosen',
          optional: false,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'damage',
                amount: {
                  kind: 'value',
                  name: 'healed-amount',
                },
              },
            },
          ],
        },
      ],
    },
  ],
});
