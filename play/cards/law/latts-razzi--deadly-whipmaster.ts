import type { UnitDefinition } from '../definition.ts';

// LAW 039: the token changes her current power before the second instruction.
export const lattsRazzi = {
  cardId: 'latts-razzi--deadly-whipmaster',
  traits: ['Underworld', 'Bounty Hunter'],
  name: 'Latts Razzi, Deadly Whipmaster',
  kind: 'unit',
  unique: true,
  aspects: ['Vigilance', 'Command'],
  cost: 3,
  power: 2,
  hp: 1,
  arena: 'ground',
  triggers: [
    {
      id: 'when-played',
      timing: 'played',
      effects: [
        { kind: 'choose-self-token' },
        {
          kind: 'damage-unit',
          amount: 'source-power',
          arena: 'ground',
          controller: 'enemy',
          optional: false,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
