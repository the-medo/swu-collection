import type { LeaderDefinition } from '../definition.ts';

// Both printed faces and official clarifications are pinned in leader-plays.json.
export const emperorPalpatineGalacticRuler = {
  cardId: 'emperor-palpatine--galactic-ruler',
  name: 'Emperor Palpatine, Galactic Ruler',
  kind: 'leader',
  aspects: ['Command', 'Villainy'],
  traits: ['Force', 'Imperial', 'Sith', 'Official'],
  unique: true,
  printedCost: 8,
  faces: {
    leader: {
      actions: [
        {
          id: 'leader-action',
          costs: [
            {
              kind: 'resources',
              amount: 1,
            },
            {
              kind: 'exhaust-self',
            },
            {
              kind: 'defeat-friendly-unit',
            },
          ],
          limit: null,
          effects: [
            {
              kind: 'select-unit',
              filter: {},
              bind: 'chosen',
              optional: false,
              effects: [
                {
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'damage',
                    amount: 1,
                  },
                },
              ],
            },
            {
              kind: 'draw-cards',
              amount: 1,
            },
          ],
        },
        {
          id: 'deploy',
          costs: [],
          limit: 'once-per-game',
          effects: [
            {
              kind: 'deploy',
              condition: {
                kind: 'resources-at-least',
                amount: 8,
              },
              as: 'unit',
            },
          ],
        },
      ],
    },
    unit: {
      power: 4,
      hp: 10,
      arena: 'ground',
      triggers: [
        {
          id: 'deployed',
          timing: 'deployed',
          effects: [
            {
              kind: 'select-unit',
              filter: {
                nonLeader: true,
                damaged: true,
              },
              bind: 'chosen',
              optional: false,
              effects: [
                {
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'take-control',
                    player: 'self',
                  },
                },
              ],
            },
          ],
        },
        {
          id: 'attack',
          timing: 'attack',
          effects: [
            {
              kind: 'select-unit',
              filter: {
                controller: 'friendly',
                otherThan: 'source',
              },
              bind: 'chosen',
              optional: true,
              effects: [
                {
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'defeat',
                  },
                  ifYouDo: [
                    {
                      kind: 'select-unit',
                      filter: {},
                      bind: 'chosen',
                      optional: false,
                      effects: [
                        {
                          kind: 'on-unit',
                          target: 'chosen',
                          operation: {
                            kind: 'damage',
                            amount: 1,
                          },
                        },
                      ],
                    },
                    {
                      kind: 'draw-cards',
                      amount: 1,
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
