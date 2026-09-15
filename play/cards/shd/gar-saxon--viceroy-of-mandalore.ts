import type { LeaderDefinition } from '../definition.ts';

// Official face text is pinned in leader-repeated-abilities.json.
export const garSaxonViceroyOfMandalore = {
  cardId: 'gar-saxon--viceroy-of-mandalore',
  name: 'Gar Saxon, Viceroy of Mandalore',
  kind: 'leader',
  aspects: ['Villainy', 'Vigilance'],
  traits: ['Imperial', 'Mandalorian', 'Official'],
  unique: true,
  printedCost: 6,
  faces: {
    leader: {
      auras: [
        {
          id: 'upgraded-strength',
          filter: {
            controller: 'friendly',
            upgraded: true,
          },
          power: 1,
        },
      ],
      actions: [
        {
          id: 'deploy',
          costs: [],
          limit: 'once-per-game',
          effects: [
            {
              kind: 'deploy',
              condition: {
                kind: 'resources-at-least',
                amount: 6,
              },
              as: 'unit',
            },
          ],
        },
      ],
    },
    unit: {
      power: 4,
      hp: 7,
      arena: 'ground',
      auras: [
        {
          id: 'upgraded-strength',
          filter: {
            controller: 'friendly',
            upgraded: true,
          },
          power: 1,
          abilities: {
            triggers: [
              {
                id: 'return-attached',
                timing: 'defeated',
                effects: [
                  {
                    kind: 'select-departed-upgrade',
                    target: 'source',
                    bind: 'returned',
                    optional: true,
                    effects: [
                      {
                        kind: 'move-card',
                        target: 'returned',
                        from: 'discard',
                        to: 'hand',
                      },
                    ],
                  },
                ],
              },
            ],
          },
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;
