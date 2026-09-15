import type { UnitDefinition } from '../definition.ts';

// SEC 087. Printed text is pinned in the meta token fixture.
export const dedraMeeroWithVerifiableData = {
  cardId: 'dedra-meero--with-verifiable-data',
  name: 'Dedra Meero, With Verifiable Data',
  kind: 'unit',
  aspects: ['Command', 'Villainy'],
  traits: ['Imperial', 'Official'],
  unique: true,
  cost: 6,
  power: 5,
  hp: 5,
  arena: 'ground',
  triggers: [
    {
      id: 'on-attack',
      timing: 'attack',
      effects: [
        {
          kind: 'create-unit',
          cardId: 'spy',
          count: 1,
        },
      ],
    },
  ],
  keywords: ['Ambush'],
} as const satisfies UnitDefinition;
