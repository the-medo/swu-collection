import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 effects fixture.
export const fireballAnExplosionWithWings = {
  cardId: 'fireball--an-explosion-with-wings',
  name: 'Fireball, An Explosion With Wings',
  kind: 'unit',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Resistance', 'Vehicle', 'Fighter'],
  unique: true,
  cost: 2,
  power: 3,
  hp: 3,
  arena: 'space',
  keywords: ['Ambush'],
  triggers: [
    {
      id: 'regroup-damage',
      timing: 'regroup-start',
      effects: [
        {
          kind: 'on-unit',
          target: 'source',
          operation: {
            kind: 'damage',
            amount: 1,
          },
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
