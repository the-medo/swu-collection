import type { UnitDefinition } from '../definition.ts';

// JTL 237. Printed text is pinned in meta-force-indirect fixture.
export const tieBomber = {
  cardId: 'tie-bomber',
  name: 'TIE Bomber',
  kind: 'unit',
  aspects: ['Villainy'],
  traits: ['Imperial', 'Vehicle', 'Fighter'],
  cost: 2,
  power: 0,
  hp: 4,
  arena: 'space',
  triggers: [
    {
      id: 'on-attack',
      timing: 'attack',
      effects: [
        {
          kind: 'indirect-damage',
          amount: 3,
          recipient: 'defender',
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
