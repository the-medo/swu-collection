import type { LeaderDefinition } from '../definition.ts';

// Official text and clarifications are pinned in leader-base-allocations.json.
export const kyloRenRashAndDeadly = {
  cardId: 'kylo-ren--rash-and-deadly',
  name: 'Kylo Ren, Rash and Deadly',
  kind: 'leader',
  aspects: ['Villainy', 'Aggression'],
  traits: ['Force', 'First Order'],
  unique: true,
  printedCost: 4,
  faces: {
    leader: {
      actions: [
        {
          id: 'leader-action',
          costs: [
            {
              kind: 'exhaust-self',
            },
            {
              kind: 'discard-hand',
              count: 1,
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
                  operation: { kind: 'modify', power: 2, hp: 0, duration: 'phase' },
                },
              ],
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
              as: 'unit',
              condition: {
                kind: 'resources-at-least',
                amount: 4,
              },
            },
          ],
        },
      ],
    },
    unit: {
      power: 5,
      hp: 4,
      arena: 'ground',
      constant: [
        {
          condition: {
            kind: 'always',
          },
          power: {
            kind: 'zone-size',
            zone: 'hand',
            player: 'self',
            multiplier: -1,
          },
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;
