import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteChopperMetalMenace = {
  cardId: 'chopper--metal-menace',
  name: 'Chopper, Metal Menace',
  kind: 'unit',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Rebel', 'Droid', 'Spectre'],
  cost: 1,
  unique: true,
  power: 1,
  hp: 3,
  arena: 'ground',
  constant: [
    {
      condition: {
        kind: 'units-at-least',
        filter: {
          controller: 'friendly',
          trait: 'Spectre',
          otherThan: 'source',
        },
        amount: 1,
      },
      raid: 1,
    },
  ],
  triggers: [
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'mill',
          player: 'defender',
          count: 1,
          bind: 'milled',
          effects: [
            {
              kind: 'if',
              condition: {
                kind: 'card-matches',
                target: 'milled',
                filter: {
                  kind: 'event',
                },
              },
              effects: [
                {
                  kind: 'select-resources',
                  player: 'enemy',
                  exhausted: false,
                  min: 1,
                  max: 1,
                  operation: 'exhaust',
                  chooser: 'self',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
