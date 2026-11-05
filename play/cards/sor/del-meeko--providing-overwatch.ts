import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteDelMeekoProvidingOverwatch = {
  cardId: 'del-meeko--providing-overwatch',
  name: 'Del Meeko, Providing Overwatch',
  kind: 'unit',
  aspects: ['Villainy', 'Vigilance'],
  traits: ['Imperial', 'Trooper'],
  cost: 3,
  unique: true,
  power: 3,
  hp: 3,
  arena: 'ground',
  restore: 1,
  enemyPlayCostIncreases: [
    {
      filter: {
        kind: 'event',
      },
      amount: 1,
    },
  ],
} as const satisfies UnitDefinition;
