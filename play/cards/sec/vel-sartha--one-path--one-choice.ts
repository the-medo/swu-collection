import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-foundations.json.
export const velSarthaOnePathOneChoice = {
  cardId: 'vel-sartha--one-path--one-choice',
  name: 'Vel Sartha, One Path, One Choice',
  kind: 'unit',
  aspects: ['Cunning'],
  traits: ['Rebel'],
  unique: true,
  cost: 5,
  power: 4,
  hp: 6,
  arena: 'ground',
  raid: 2,
  auras: [
    {
      id: 'vulnerable-defender',
      filter: {
        controller: 'enemy',
        exhausted: true,
        defending: true,
      },
      power: -2,
    },
  ],
} as const satisfies UnitDefinition;
