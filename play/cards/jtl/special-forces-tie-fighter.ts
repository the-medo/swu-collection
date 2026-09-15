import type { UnitDefinition } from '../definition.ts';

// JTL . Printed text is pinned in the meta effects fixture.
export const specialForcesTieFighter = {
  cardId: 'special-forces-tie-fighter',
  name: 'Special Forces TIE Fighter',
  kind: 'unit',
  aspects: ['Aggression', 'Villainy'],
  traits: ['First Order', 'Vehicle', 'Fighter'],
  cost: 2,
  power: 2,
  hp: 3,
  arena: 'space',
  triggers: [
    {
      id: 'on-played',
      timing: 'played',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'opponent-has-more-units',
            arena: 'space',
          },
          effects: [
            {
              kind: 'on-unit',
              target: 'source',
              operation: {
                kind: 'ready',
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
