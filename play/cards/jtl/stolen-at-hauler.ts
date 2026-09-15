import type { UnitDefinition } from '../definition.ts';
export const stolenAtHauler = {
  cardId: 'stolen-at-hauler',
  name: 'Stolen AT-Hauler',
  kind: 'unit',
  cost: 3,
  power: 4,
  hp: 5,
  arena: 'space',
  aspects: ['Cunning'],
  traits: ['Underworld', 'Vehicle', 'Transport'],
  triggers: [
    {
      id: 'defeated-permission',
      timing: 'defeated',
      effects: [{ kind: 'grant-discard-play', target: 'source', player: 'enemy' }],
    },
  ],
} as const satisfies UnitDefinition;
