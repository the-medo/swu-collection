import { hmwUnit } from './define.ts';

export const hmwKeeperOfSkaraNalAwoken = hmwUnit('keeper-of-skara-nal--awoken', {
  restore: 2,
  triggers: [
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'pay',
          optional: true,
          costs: [
            {
              kind: 'discard-hand',
              count: 2,
              filter: { name: 'Keeper of Skara Nal' },
            },
          ],
          effects: [
            {
              kind: 'on-unit',
              target: 'source',
              operation: {
                kind: 'modify',
                power: 15,
                hp: 0,
                abilities: { keywords: ['Overwhelm'] },
                duration: 'attack',
              },
            },
          ],
        },
      ],
    },
  ],
});
