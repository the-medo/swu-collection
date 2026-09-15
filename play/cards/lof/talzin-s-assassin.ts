import type { UnitDefinition } from '../definition.ts';

// LOF 035. Printed text is pinned in meta-force-indirect fixture.
export const talzinSAssassin = {
  cardId: 'talzin-s-assassin',
  name: "Talzin's Assassin",
  kind: 'unit',
  aspects: ['Vigilance', 'Villainy'],
  traits: ['Force', 'Night'],
  cost: 4,
  power: 4,
  hp: 4,
  arena: 'ground',
  triggers: [
    {
      id: 'on-played',
      timing: 'played',
      effects: [
        {
          kind: 'pay',
          costs: [
            {
              kind: 'force',
            },
          ],
          optional: true,
          effects: [
            {
              kind: 'select-unit',
              bind: 'chosen',
              filter: {},
              optional: false,
              effects: [
                {
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'modify',
                    power: -3,
                    hp: -3,
                    duration: 'phase',
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
