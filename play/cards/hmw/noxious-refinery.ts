import { hmwUpgrade } from './define.ts';

export const hmwNoxiousRefinery = hmwUpgrade('noxious-refinery', {
  grants: {
    triggers: [
      {
        id: 'regroup',
        timing: 'regroup-start',
        effects: [
          {
            kind: 'reveal-top',
            player: 'self',
            bind: 'top',
            effects: [
              {
                kind: 'if',
                condition: {
                  kind: 'card-matches',
                  target: 'top',
                  filter: {
                    aspect: 'Aggression',
                  },
                },
                effects: [
                  {
                    kind: 'damage-unit',
                    amount: 1,
                    arena: 'any',
                    controller: 'enemy',
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
});
