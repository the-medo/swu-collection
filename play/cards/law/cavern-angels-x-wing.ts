import type { UnitDefinition } from '../definition.ts';

// LAW . V8 rules; printed text pinned in meta combat fixture.
export const cavernAngelsXWing = {
  cardId: 'cavern-angels-x-wing',
  name: 'Cavern Angels X-Wing',
  kind: 'unit',
  aspects: ['Aggression'],
  traits: ['Rebel', 'Vehicle', 'Fighter'],
  cost: 2,
  power: 2,
  hp: 1,
  arena: 'space',
  triggers: [
    {
      id: 'on-defeated',
      timing: 'defeated',
      effects: [
        {
          kind: 'damage-base',
          amount: 2,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
