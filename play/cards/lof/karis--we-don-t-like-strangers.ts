import type { UnitDefinition } from '../definition.ts';

// LOF 031. Printed text is pinned in meta-force-indirect fixture.
export const karisWeDonTLikeStrangers = {
  cardId: 'karis--we-don-t-like-strangers',
  name: "Karis, We Don't Like Strangers",
  kind: 'unit',
  aspects: ['Vigilance', 'Villainy'],
  traits: ['Force', 'Night'],
  unique: true,
  cost: 2,
  power: 2,
  hp: 4,
  arena: 'ground',
  triggers: [
    {
      id: 'on-defeated',
      timing: 'defeated',
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
                    power: -2,
                    hp: -2,
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
