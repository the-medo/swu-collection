import type { LeaderDefinition } from '../definition.ts';

// Printed faces and clarifications are pinned in leader-history.json.
export const jynErsoTimeToFight = {
  cardId: 'jyn-erso--time-to-fight',
  name: 'Jyn Erso, Time to Fight',
  kind: 'leader',
  aspects: ['Vigilance', 'Heroism'],
  traits: ['Rebel'],
  unique: true,
  printedCost: 5,
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
          ],
          limit: null,
          effects: [
            {
              kind: 'if',
              condition: {
                kind: 'unit-history-at-least',
                event: 'defeated',
                player: 'self',
                amount: 1,
                trait: 'Rebel',
              },
              effects: [
                {
                  kind: 'search-deck',
                  count: 3,
                  filter: 'any',
                  reveal: false,
                  max: 1,
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
      triggers: [
        {
          id: 'attack',
          timing: 'attack',
          effects: [
            {
              kind: 'if',
              condition: {
                kind: 'unit-history-at-least',
                event: 'defeated',
                player: 'self',
                amount: 1,
                trait: 'Rebel',
              },
              effects: [
                {
                  kind: 'search-deck',
                  count: 3,
                  filter: 'any',
                  reveal: false,
                  max: 1,
                },
              ],
            },
          ],
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;
