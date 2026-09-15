import type { UnitDefinition } from '../definition.ts';

// JTL . V8 rules; printed text pinned in meta combat fixture.
export const redFiveRunningTheTrench = {
  cardId: 'red-five--running-the-trench',
  name: 'Red Five, Running the Trench',
  kind: 'unit',
  aspects: ['Aggression', 'Heroism'],
  traits: ['Rebel', 'Vehicle', 'Fighter'],
  unique: true,
  cost: 3,
  power: 3,
  hp: 4,
  arena: 'space',
  triggers: [
    {
      id: 'on-attack',
      timing: 'attack',
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
