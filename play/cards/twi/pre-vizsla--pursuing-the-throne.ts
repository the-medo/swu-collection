import type { LeaderDefinition } from '../definition.ts';

// Official faces and revised timing text are pinned in leader-phase-events.json.
export const preVizslaPursuingTheThrone = {
  cardId: 'pre-vizsla--pursuing-the-throne',
  name: 'Pre Vizsla, Pursuing the Throne',
  kind: 'leader',
  aspects: ['Villainy', 'Aggression'],
  traits: ['Mandalorian', 'Trooper'],
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
              kind: 'select-target',
              units: {},
              bind: 'target',
              optional: false,
              effects: [
                {
                  kind: 'damage-target',
                  target: 'target',
                  amount: {
                    kind: 'phase-count',
                    event: 'cards-drawn',
                    player: 'self',
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
              condition: {
                kind: 'resources-at-least',
                amount: 5,
              },
              as: 'unit',
            },
          ],
        },
      ],
    },
    unit: {
      power: 4,
      hp: 6,
      arena: 'ground',
      constant: [
        {
          condition: {
            kind: 'numeric-at-least',
            value: {
              kind: 'zone-size',
              zone: 'hand',
              player: 'self',
            },
            amount: 3,
          },
          abilities: {
            keywords: ['Saboteur'],
          },
        },
        {
          condition: {
            kind: 'numeric-at-least',
            value: {
              kind: 'zone-size',
              zone: 'hand',
              player: 'self',
            },
            amount: 6,
          },
          power: 2,
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;
