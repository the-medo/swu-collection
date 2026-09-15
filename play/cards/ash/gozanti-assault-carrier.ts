import type { UnitDefinition } from '../definition.ts';

// ASH 099. Printed text is pinned in meta-board fixture.
export const gozantiAssaultCarrier = {
  cardId: 'gozanti-assault-carrier',
  name: 'Gozanti Assault Carrier',
  kind: 'unit',
  aspects: ['Command', 'Villainy'],
  traits: ['Imperial', 'Vehicle', 'Capital Ship'],
  cost: 5,
  power: 4,
  hp: 6,
  arena: 'space',
  keywords: ['Support'],
  triggers: [
    {
      id: 'on-attack',
      timing: 'attack',
      effects: [
        {
          kind: 'on-unit',
          target: 'source',
          operation: {
            kind: 'modify',
            power: 0,
            hp: 0,
            duration: 'phase',
            abilities: {
              keywords: ['Sentinel'],
            },
          },
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
