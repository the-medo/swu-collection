import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-effects.json.
export const deathTrooper = {
  cardId: 'death-trooper',
  name: 'Death Trooper',
  kind: 'unit',
  aspects: ['Vigilance', 'Villainy'],
  traits: ['Imperial', 'Trooper'],
  cost: 3,
  power: 3,
  hp: 3,
  arena: 'ground',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'friendly',
            arena: 'ground',
          },
          bind: 'friendly',
          optional: false,
          effects: [
            {
              kind: 'select-unit',
              filter: {
                controller: 'enemy',
                arena: 'ground',
              },
              bind: 'enemy',
              optional: false,
              effects: [
                {
                  kind: 'damage-bound',
                  targets: ['friendly', 'enemy'],
                  amount: 2,
                },
              ],
              allowMissing: true,
            },
          ],
          allowMissing: true,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
