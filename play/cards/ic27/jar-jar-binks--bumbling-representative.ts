import { ic27Unit } from './define.ts';

export const ic27JarJarBinksBumblingRepresentative = ic27Unit(
  'jar-jar-binks--bumbling-representative',
  {
    triggers: [
      {
        id: 'attack',
        timing: 'attack',
        effects: [
          {
            kind: 'mill',
            player: 'self',
            count: 1,
            bind: 'milled',
            effects: [
              {
                kind: 'if',
                condition: {
                  kind: 'card-matches',
                  target: 'milled',
                  filter: {
                    minCost: 6,
                  },
                },
                effects: [
                  {
                    kind: 'on-unit',
                    target: 'source',
                    operation: {
                      kind: 'modify',
                      power: 4,
                      hp: 0,
                      duration: 'attack',
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
);
