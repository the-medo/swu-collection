import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-foundations.json.
export const domesticatedLothCat = {
  cardId: 'domesticated-loth-cat',
  name: 'Domesticated Loth-Cat',
  kind: 'unit',
  aspects: ['Vigilance'],
  traits: ['Creature'],
  cost: 1,
  power: 1,
  hp: 3,
  arena: 'ground',
  auras: [
    {
      id: 'disrupt-entry',
      filter: {
        controller: 'enemy',
      },
      losesKeywords: ['Ambush', 'Support'],
    },
  ],
} as const satisfies UnitDefinition;
