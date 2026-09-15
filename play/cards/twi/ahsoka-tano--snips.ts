import type { LeaderDefinition } from '../definition.ts';

// Printed faces and clarifications are pinned in leader-history.json.
export const ahsokaTanoSnips = {
  cardId: 'ahsoka-tano--snips',
  name: 'Ahsoka Tano, Snips',
  kind: 'leader',
  aspects: ['Aggression', 'Heroism'],
  traits: ['Force', 'Jedi', 'Republic'],
  unique: true,
  printedCost: 5,
  faces: {
    leader: {
      keywords: ['Coordinate'],
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
              kind: 'attack-with-unit',
              powerBonus: 1,
            },
          ],
          condition: {
            kind: 'units-at-least',
            filter: {
              controller: 'friendly',
            },
            amount: 3,
          },
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
      keywords: ['Coordinate'],
      power: 3,
      hp: 6,
      arena: 'ground',
      constant: [
        {
          condition: {
            kind: 'units-at-least',
            filter: {
              controller: 'friendly',
            },
            amount: 3,
          },
          power: 2,
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;
