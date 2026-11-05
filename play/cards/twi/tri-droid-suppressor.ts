import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteTriDroidSuppressor = {
  cardId: 'tri-droid-suppressor',
  name: 'Tri-Droid Suppressor',
  kind: 'unit',
  aspects: ['Cunning'],
  traits: ['Separatist', 'Droid', 'Vehicle', 'Walker'],
  cost: 7,
  power: 4,
  hp: 7,
  arena: 'ground',
  exploit: 2,
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'enemy',
            arena: 'ground',
          },
          optional: false,
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
} as const satisfies UnitDefinition;
