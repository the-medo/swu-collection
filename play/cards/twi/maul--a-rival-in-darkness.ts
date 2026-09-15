import type { LeaderDefinition } from '../definition.ts';

// Both printed faces are pinned in leader-foundations.json.
export const maulARivalInDarkness = {
  cardId: 'maul--a-rival-in-darkness',
  name: 'Maul, A Rival in Darkness',
  kind: 'leader',
  aspects: ['Villainy', 'Aggression'],
  traits: ['Force', 'Underworld'],
  unique: true,
  printedCost: 6,
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
              kind: 'select-unit',
              filter: {
                controller: 'friendly',
              },
              bind: 'chosen',
              optional: false,
              effects: [
                {
                  kind: 'attack-bound',
                  target: 'chosen',
                  optional: false,
                  abilities: {
                    keywords: ['Overwhelm'],
                  },
                },
              ],
              forAttack: {},
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
                amount: 6,
              },
            },
          ],
        },
      ],
    },
    unit: {
      power: 6,
      hp: 6,
      arena: 'ground',
      keywords: ['Overwhelm'],
      auras: [
        {
          id: 'overwhelm',
          filter: {
            controller: 'friendly',
            otherThan: 'source',
          },
          abilities: {
            keywords: ['Overwhelm'],
          },
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;
