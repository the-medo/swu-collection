import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 traits and choices fixture.
export const raddusHoldoSFinalCommand = {
  cardId: 'raddus--holdo-s-final-command',
  name: "Raddus, Holdo's Final Command",
  kind: 'unit',
  aspects: ['Command', 'Heroism'],
  traits: ['Resistance', 'Vehicle', 'Capital Ship'],
  unique: true,
  cost: 7,
  power: 8,
  hp: 6,
  arena: 'space',
  constant: [
    {
      condition: {
        kind: 'cards-in-play-at-least',
        filter: {
          controller: 'friendly',
          trait: 'Resistance',
          otherThan: 'source',
          roles: ['unit', 'upgrade', 'leader'],
        },
        amount: 1,
      },
      abilities: {
        keywords: ['Sentinel'],
      },
    },
  ],
  triggers: [
    {
      id: 'defeated-damage',
      timing: 'defeated',
      effects: [
        {
          kind: 'damage-unit',
          amount: 'source-power',
          arena: 'any',
          controller: 'enemy',
          optional: false,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
