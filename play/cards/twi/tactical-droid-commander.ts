import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteTacticalDroidCommander = {
  cardId: 'tactical-droid-commander',
  name: 'Tactical Droid Commander',
  kind: 'unit',
  aspects: ['Cunning', 'Villainy'],
  traits: ['Separatist', 'Droid'],
  cost: 5,
  power: 4,
  hp: 4,
  arena: 'ground',
  exploit: 2,
  triggers: [
    {
      id: 'friendly-played',
      timing: 'friendly-played',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            maxCost: {
              kind: 'card-cost',
              target: 'subject',
            },
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
      excludeSelf: true,
      condition: {
        kind: 'card-matches',
        target: 'subject',
        filter: {
          trait: 'Separatist',
        },
      },
    },
  ],
} as const satisfies UnitDefinition;
