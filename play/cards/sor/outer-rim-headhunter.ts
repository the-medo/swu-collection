import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteOuterRimHeadhunter = {
  cardId: 'outer-rim-headhunter',
  name: 'Outer Rim Headhunter',
  kind: 'unit',
  aspects: ['Cunning'],
  traits: ['Fringe', 'Vehicle', 'Fighter'],
  cost: 2,
  power: 1,
  hp: 3,
  arena: 'space',
  raid: 1,
  triggers: [
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'units-at-least',
            filter: {
              controller: 'friendly',
              leader: true,
            },
            amount: 1,
          },
          effects: [
            {
              kind: 'select-unit',
              filter: {
                nonLeader: true,
              },
              optional: true,
              bind: 'chosen',
              effects: [
                {
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'exhaust',
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
