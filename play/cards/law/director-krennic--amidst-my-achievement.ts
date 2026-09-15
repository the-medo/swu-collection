import type { LeaderDefinition } from '../definition.ts';
export const directorKrennic = {
  cardId: 'director-krennic--amidst-my-achievement',
  name: 'Director Krennic, Amidst My Achievement',
  kind: 'leader',
  printedCost: 7,
  aspects: ['Command', 'Villainy'],
  traits: ['Imperial', 'Official'],
  faces: {
    leader: {
      actions: [
        {
          id: 'create-credit',
          costs: [{ kind: 'exhaust-self' }, { kind: 'defeat-friendly-unit' }],
          limit: null,
          effects: [{ kind: 'create-credits', amount: 1 }],
        },
        {
          id: 'deploy',
          costs: [],
          limit: 'once-per-game',
          effects: [
            { kind: 'deploy', as: 'unit', condition: { kind: 'resources-at-least', amount: 7 } },
          ],
        },
      ],
    },
    unit: {
      power: 4,
      hp: 9,
      arena: 'ground',
      triggers: [
        {
          id: 'deployed-damage',
          timing: 'deployed',
          effects: [
            {
              kind: 'select-unit',
              filter: { controller: 'friendly', otherThan: 'source' },
              bind: 'damager',
              optional: false,
              effects: [
                {
                  kind: 'select-unit',
                  filter: { controller: 'enemy' },
                  bind: 'victim',
                  optional: false,
                  effects: [
                    {
                      kind: 'on-unit',
                      target: 'victim',
                      operation: {
                        kind: 'damage',
                        amount: { kind: 'unit-stat', target: 'damager', stat: 'power' },
                        source: 'damager',
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
  },
} as const satisfies LeaderDefinition;
