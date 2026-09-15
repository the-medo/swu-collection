import type { UnitDefinition } from '../definition.ts';

// LOF 144. Printed text is pinned in the meta foundation fixture.
export const jediStarfighter = {
  cardId: 'jedi-starfighter',
  name: 'Jedi Starfighter',
  kind: 'unit',
  aspects: ['Aggression', 'Heroism'],
  traits: ['Jedi', 'Republic', 'Vehicle', 'Fighter'],
  cost: 2,
  power: 1,
  hp: 4,
  arena: 'space',
  triggers: [
    {
      id: 'on-attack',
      timing: 'attack',
      effects: [
        {
          kind: 'damage-unit',
          amount: 1,
          arena: 'space',
          optional: true,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
