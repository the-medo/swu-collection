import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteEnfysNestMarauder = {
  cardId: 'enfys-nest--marauder',
  name: 'Enfys Nest, Marauder',
  kind: 'unit',
  aspects: ['Cunning'],
  traits: ['Underworld'],
  cost: 6,
  unique: true,
  power: 5,
  hp: 4,
  arena: 'ground',
  keywords: ['Ambush'],
  auras: [
    {
      id: 'aura',
      filter: {
        defendingAgainst: {
          controller: 'friendly',
          ambushing: true,
        },
      },
      power: -3,
    },
  ],
} as const satisfies UnitDefinition;
