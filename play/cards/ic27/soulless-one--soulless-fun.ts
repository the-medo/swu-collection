import { ic27Unit } from './define.ts';

export const ic27SoullessOneSoullessFun = ic27Unit('soulless-one--soulless-fun', {
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'enemy',
            arena: 'ground',
          },
          bind: 'chosen',
          optional: false,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'modify',
                power: -3,
                hp: 0,
                duration: 'source-in-play',
              },
            },
          ],
        },
      ],
    },
  ],
});
