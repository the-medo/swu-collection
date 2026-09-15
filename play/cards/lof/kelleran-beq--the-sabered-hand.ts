import type { UnitDefinition } from '../definition.ts';

// LOF 100. Printed text is pinned in meta-play-costs fixture.
export const kelleranBeqTheSaberedHand = {
  cardId: 'kelleran-beq--the-sabered-hand',
  name: 'Kelleran Beq, The Sabered Hand',
  unique: true,
  kind: 'unit',
  aspects: ['Command', 'Heroism'],
  traits: ['Force', 'Jedi', 'Republic'],
  cost: 7,
  power: 7,
  hp: 7,
  arena: 'ground',
  triggers: [
    {
      id: 'on-played',
      timing: 'played',
      effects: [
        {
          kind: 'search-deck',
          count: 7,
          filter: 'unit',
          max: 1,
          play: {
            discount: 3,
          },
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
