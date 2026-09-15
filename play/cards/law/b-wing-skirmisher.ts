import type { UnitDefinition } from '../definition.ts';

// LAW . V8 rules; printed text pinned in meta combat fixture.
export const bWingSkirmisher = {
  cardId: 'b-wing-skirmisher',
  name: 'B-Wing Skirmisher',
  kind: 'unit',
  aspects: ['Aggression', 'Heroism'],
  traits: ['Rebel', 'Vehicle', 'Fighter'],
  cost: 4,
  power: 4,
  hp: 4,
  arena: 'space',
  triggers: [
    {
      id: 'on-played',
      timing: 'played',
      effects: [
        {
          kind: 'damage-units',
          amount: 1,
          filter: {
            arena: 'space',
          },
          max: 2,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
