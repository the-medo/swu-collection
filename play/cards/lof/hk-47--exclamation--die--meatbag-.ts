import type { UnitDefinition } from '../definition.ts';

export const hk47 = {
  cardId: 'hk-47--exclamation--die--meatbag-',
  traits: ['Sith', 'Droid'],
  name: 'HK-47, Exclamation: Die, Meatbag!',
  kind: 'unit',
  cost: 2,
  power: 2,
  hp: 4,
  arena: 'ground',
  aspects: ['Aggression', 'Villainy'],
  unique: true,
  triggers: [
    {
      id: 'enemy-defeated',
      timing: 'enemy-defeated',
      effects: [{ kind: 'damage-bases', amount: 1, targets: 'enemy' }],
    },
  ],
} as const satisfies UnitDefinition;
