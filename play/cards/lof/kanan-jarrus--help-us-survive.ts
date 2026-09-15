import type { LeaderDefinition } from '../definition.ts';

// Both printed faces are pinned in leader-foundations.json.
export const kananJarrusHelpUsSurvive = {
  cardId: 'kanan-jarrus--help-us-survive',
  name: 'Kanan Jarrus, Help Us Survive',
  kind: 'leader',
  aspects: ['Vigilance', 'Heroism'],
  traits: ['Force', 'Jedi', 'Rebel', 'Spectre'],
  unique: true,
  printedCost: 6,
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
              kind: 'select-unit',
              filter: {
                anyTrait: ['Creature', 'Spectre'],
              },
              bind: 'chosen',
              optional: false,
              effects: [
                {
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'give-token',
                    token: 'shield',
                    count: 1,
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
                amount: 6,
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
      keywords: ['Shielded'],
      constant: [
        {
          condition: {
            kind: 'units-at-least',
            filter: {
              controller: 'friendly',
              otherThan: 'source',
              anyTrait: ['Creature', 'Spectre'],
            },
            amount: 1,
          },
          power: 2,
          hp: 2,
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;
