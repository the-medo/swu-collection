import type { UnitDefinition } from '../definition.ts';

export const greenLeader = {
  cardId: 'green-leader--crynyd-s-sacrifice',
  traits: ['Rebel', 'Vehicle', 'Fighter'],
  name: "Green Leader, Crynyd's Sacrifice",
  kind: 'unit',
  cost: 2,
  power: 3,
  hp: 1,
  arena: 'space',
  aspects: ['Aggression', 'Heroism'],
  unique: true,
  triggers: [
    {
      id: 'when-defeated',
      timing: 'defeated',
      effects: [{ kind: 'damage-unit', amount: 2, arena: 'any', optional: true }],
    },
  ],
} as const satisfies UnitDefinition;
