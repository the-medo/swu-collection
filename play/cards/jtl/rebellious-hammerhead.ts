import type { UnitDefinition } from '../definition.ts';

// JTL . V8 rules; printed text pinned in meta combat fixture.
export const rebelliousHammerhead = {
  cardId: 'rebellious-hammerhead',
  name: 'Rebellious Hammerhead',
  kind: 'unit',
  aspects: ['Aggression', 'Heroism'],
  traits: ['Rebel', 'Vehicle', 'Capital Ship'],
  cost: 6,
  power: 5,
  hp: 7,
  arena: 'space',
  triggers: [
    {
      id: 'on-played',
      timing: 'played',
      effects: [
        {
          kind: 'damage-unit',
          amount: 'hand-size',
          arena: 'any',
          optional: true,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
