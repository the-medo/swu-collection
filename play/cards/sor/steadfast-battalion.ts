import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteSteadfastBattalion = {
  cardId: 'steadfast-battalion',
  name: 'Steadfast Battalion',
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Trooper'],
  cost: 5,
  power: 5,
  hp: 5,
  arena: 'ground',
  keywords: ['Overwhelm'],
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
                controller: 'friendly',
              },
              optional: false,
              bind: 'chosen',
              effects: [
                {
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'modify',
                    power: 2,
                    hp: 2,
                    duration: 'phase',
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
