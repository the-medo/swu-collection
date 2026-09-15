import type { UnitDefinition } from '../definition.ts';

// JTL . V8 rules; printed text pinned in meta combat fixture.
export const tieDaggerVanguard = {
  cardId: 'tie-dagger-vanguard',
  name: 'TIE Dagger Vanguard',
  kind: 'unit',
  aspects: ['Villainy'],
  traits: ['First Order', 'Sith', 'Vehicle', 'Fighter'],
  cost: 3,
  power: 2,
  hp: 2,
  arena: 'space',
  triggers: [
    {
      id: 'on-played',
      timing: 'played',
      effects: [
        {
          kind: 'damage-unit',
          amount: 2,
          arena: 'any',
          optional: true,
          filter: {
            damaged: true,
          },
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
