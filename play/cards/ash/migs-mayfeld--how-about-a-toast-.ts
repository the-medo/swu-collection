import type { UnitDefinition } from '../definition.ts';

export const migsMayfeld = {
  cardId: 'migs-mayfeld--how-about-a-toast-',
  name: 'Migs Mayfeld, How About a Toast?',
  kind: 'unit',
  unique: true,
  traits: ['Fringe'],
  aspects: ['Aggression'],
  cost: 2,
  power: 2,
  hp: 3,
  arena: 'ground',
  keywords: ['Support'],
  triggers: [
    {
      id: 'on-attack',
      timing: 'attack',
      effects: [{ kind: 'damage-defender', amount: 1, upgradedAmount: 2 }],
    },
  ],
} as const satisfies UnitDefinition;
