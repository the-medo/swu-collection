import type { UnitDefinition } from '../definition.ts';

// LOF 129. Printed text is pinned in meta-force-indirect fixture.
export const acolyteOfTheBeyond = {
  cardId: 'acolyte-of-the-beyond',
  name: 'Acolyte of the Beyond',
  kind: 'unit',
  aspects: ['Aggression', 'Villainy'],
  traits: ['Sith'],
  cost: 2,
  power: 2,
  hp: 3,
  arena: 'ground',
  triggers: [
    {
      id: 'on-attack',
      timing: 'attack',
      effects: [
        {
          kind: 'gain-force',
        },
      ],
    },
    {
      id: 'on-defeated',
      timing: 'defeated',
      effects: [
        {
          kind: 'gain-force',
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
