import type { UnitDefinition } from '../definition.ts';

// Reprinted in IC27 186; identity and text follow the official catalog.
export const ic27ReprintR2D2IgnoringProtocol = {
  cardId: 'r2-d2--ignoring-protocol',
  name: 'R2-D2, Ignoring Protocol',
  kind: 'unit',
  aspects: ['Heroism'],
  traits: ['Rebel', 'Droid'],
  cost: 1,
  unique: true,
  power: 1,
  hp: 4,
  arena: 'ground',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'look-deck',
          count: 1,
          mode: 'bottom-any',
        },
      ],
    },
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'look-deck',
          count: 1,
          mode: 'bottom-any',
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
