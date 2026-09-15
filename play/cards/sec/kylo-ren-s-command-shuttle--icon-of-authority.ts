import type { UnitDefinition } from '../definition.ts';

// SEC 032. Printed text is pinned in meta-continuous fixture.
export const kyloRenSCommandShuttleIconOfAuthority = {
  cardId: 'kylo-ren-s-command-shuttle--icon-of-authority',
  name: "Kylo Ren's Command Shuttle, Icon of Authority",
  kind: 'unit',
  aspects: ['Vigilance', 'Villainy'],
  traits: ['First Order', 'Vehicle', 'Transport'],
  cost: 4,
  unique: true,
  power: 3,
  hp: 5,
  arena: 'space',
  auras: [
    {
      id: 'sentinel-health',
      filter: {
        controller: 'friendly',
        arena: 'ground',
        hasKeyword: 'Sentinel',
      },
      hp: 2,
    },
  ],
} as const satisfies UnitDefinition;
