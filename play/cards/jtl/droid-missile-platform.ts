import type { UnitDefinition } from '../definition.ts';

// JTL 162. Printed text is pinned in meta-force-indirect fixture.
export const droidMissilePlatform = {
  cardId: 'droid-missile-platform',
  name: 'Droid Missile Platform',
  kind: 'unit',
  aspects: ['Aggression'],
  traits: ['Separatist', 'Droid', 'Vehicle', 'Transport'],
  cost: 3,
  power: 4,
  hp: 2,
  arena: 'space',
  triggers: [
    {
      id: 'on-defeated',
      timing: 'defeated',
      effects: [
        {
          kind: 'indirect-damage',
          amount: 3,
          recipient: 'chosen',
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
