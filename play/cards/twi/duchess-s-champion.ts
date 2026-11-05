import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteDuchessSChampion = {
  cardId: 'duchess-s-champion',
  name: "Duchess's Champion",
  kind: 'unit',
  aspects: ['Vigilance', 'Vigilance'],
  traits: ['Mandalorian'],
  cost: 4,
  power: 1,
  hp: 8,
  arena: 'ground',
  constant: [
    {
      condition: {
        kind: 'units-at-least',
        filter: {
          controller: 'enemy',
        },
        amount: 3,
      },
      abilities: {
        keywords: ['Sentinel'],
      },
    },
  ],
} as const satisfies UnitDefinition;
