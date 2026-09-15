import type { UnitDefinition } from '../definition.ts';
export const rogueOneAtAnyCost = {
  cardId: 'rogue-one--at-any-cost',
  name: 'Rogue One, At Any Cost',
  kind: 'unit',
  unique: true,
  cost: 3,
  power: 3,
  hp: 3,
  arena: 'space',
  aspects: ['Vigilance'],
  traits: ['Rebel', 'Vehicle', 'Transport'],
  triggers: [
    {
      id: 'friendly-defeat-look',
      timing: 'friendly-defeated',
      effects: [{ kind: 'look-deck', count: 2, mode: 'bottom-any' }],
    },
  ],
} as const satisfies UnitDefinition;
