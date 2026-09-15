import type { UnitDefinition } from '../definition.ts';

// SEC 111. Printed text is pinned in meta-plot fixture.
export const jarJarBinksMesaPropose = {
  cardId: 'jar-jar-binks--mesa-propose-',
  name: 'Jar Jar Binks, Mesa Propose\u2026',
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Naboo', 'Republic', 'Gungan', 'Official'],
  cost: 2,
  keywords: ['Plot'],
  power: 2,
  hp: 1,
  arena: 'ground',
  unique: true,
  triggers: [
    {
      id: 'on-played',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'friendly',
            otherThan: 'source',
          },
          bind: 'chosen',
          optional: true,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'modify',
                power: 2,
                hp: 2,
                duration: 'phase',
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
