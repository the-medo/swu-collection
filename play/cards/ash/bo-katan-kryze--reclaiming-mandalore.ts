import type { LeaderDefinition } from '../definition.ts';

// Both printed faces are pinned in leader-foundations.json.
export const boKatanKryzeReclaimingMandalore = {
  cardId: 'bo-katan-kryze--reclaiming-mandalore',
  name: 'Bo-Katan Kryze, Reclaiming Mandalore',
  kind: 'leader',
  aspects: ['Command', 'Heroism'],
  traits: ['Mandalorian'],
  unique: true,
  printedCost: 10,
  faces: {
    leader: {
      actions: [
        {
          id: 'leader-action',
          costs: [
            {
              kind: 'resources',
              amount: 2,
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
                kind: 'all',
                conditions: [
                  {
                    kind: 'units-at-least',
                    filter: {
                      controller: 'friendly',
                      arena: 'ground',
                    },
                    amount: 1,
                  },
                  {
                    kind: 'units-at-least',
                    filter: {
                      controller: 'friendly',
                      arena: 'space',
                    },
                    amount: 1,
                  },
                ],
              },
              effects: [
                {
                  kind: 'create-unit',
                  cardId: 'mandalorian',
                  count: 1,
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
                amount: 10,
                reducedBy: {
                  kind: 'unit-count',
                  filter: {
                    controller: 'friendly',
                    trait: 'Mandalorian',
                  },
                },
              },
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
          id: 'mandalorians',
          filter: {
            controller: 'friendly',
            otherThan: 'source',
            trait: 'Mandalorian',
          },
          power: 1,
        },
      ],
      triggers: [
        {
          id: 'attack',
          timing: 'attack',
          effects: [
            {
              kind: 'if',
              condition: {
                kind: 'all',
                conditions: [
                  {
                    kind: 'units-at-least',
                    filter: {
                      controller: 'friendly',
                      arena: 'ground',
                    },
                    amount: 1,
                  },
                  {
                    kind: 'units-at-least',
                    filter: {
                      controller: 'friendly',
                      arena: 'space',
                    },
                    amount: 1,
                  },
                ],
              },
              effects: [
                {
                  kind: 'create-unit',
                  cardId: 'mandalorian',
                  count: 1,
                },
              ],
            },
          ],
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;
