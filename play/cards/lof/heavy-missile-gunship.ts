import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-effects.json.
export const heavyMissileGunship = {
  cardId: 'heavy-missile-gunship',
  name: 'Heavy Missile Gunship',
  kind: 'unit',
  aspects: ['Aggression', 'Villainy'],
  traits: ['Separatist', 'Droid', 'Vehicle', 'Transport'],
  cost: 4,
  power: 4,
  hp: 3,
  arena: 'space',
  actions: [
    {
      id: 'ground-bombardment',
      costs: [
        {
          kind: 'exhaust-self',
        },
      ],
      limit: null,
      effects: [
        {
          kind: 'damage-unit',
          amount: 2,
          arena: 'ground',
          optional: false,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
