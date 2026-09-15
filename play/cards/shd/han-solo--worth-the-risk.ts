import type { LeaderDefinition } from '../definition.ts';

// Both printed faces are pinned in leader-foundations.json.
export const hanSoloWorthTheRisk = {
  cardId: 'han-solo--worth-the-risk',
  name: 'Han Solo, Worth the Risk',
  kind: 'leader',
  aspects: ['Heroism', 'Aggression'],
  traits: ['Underworld'],
  unique: true,
  printedCost: 5,
  faces: {
    leader: {
      actions: [
        {
          id: 'leader-action',
          costs: [
            {
              kind: 'exhaust-self',
            },
          ],
          limit: null,
          effects: [
            {
              kind: 'play-card',
              from: 'hand',
              filter: {
                kind: 'unit',
              },
              optional: false,
              discount: 1,
              bind: 'played',
              effects: [
                {
                  kind: 'on-unit',
                  target: 'played',
                  operation: {
                    kind: 'damage',
                    amount: 2,
                  },
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
                amount: 5,
              },
            },
          ],
        },
      ],
    },
    unit: {
      power: 3,
      hp: 6,
      arena: 'ground',
      actions: [
        {
          id: 'leader-action',
          costs: [],
          limit: null,
          effects: [
            {
              kind: 'play-card',
              from: 'hand',
              filter: {
                kind: 'unit',
              },
              optional: false,
              discount: 1,
              bind: 'played',
              effects: [
                {
                  kind: 'on-unit',
                  target: 'played',
                  operation: {
                    kind: 'damage',
                    amount: 2,
                  },
                },
              ],
              requirePlay: true,
            },
          ],
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;
