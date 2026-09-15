import type { UnitDefinition } from '../definition.ts';

// SEC 189. Printed text is pinned in meta-plot fixture.
export const lurkingSnubFighter = {
  cardId: 'lurking-snub-fighter',
  name: 'Lurking Snub Fighter',
  kind: 'unit',
  aspects: ['Cunning', 'Villainy'],
  traits: ['Underworld', 'Vehicle', 'Fighter'],
  cost: 3,
  keywords: ['Plot'],
  power: 2,
  hp: 3,
  arena: 'space',
  triggers: [
    {
      id: 'on-played',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {},
          bind: 'chosen',
          optional: true,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'exhaust',
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
