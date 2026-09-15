import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 effects fixture.
export const morganElsbethLifeAbandoned = {
  cardId: 'morgan-elsbeth--life-abandoned',
  name: 'Morgan Elsbeth, Life Abandoned',
  kind: 'unit',
  aspects: ['Vigilance', 'Villainy'],
  traits: ['Force', 'Night'],
  unique: true,
  cost: 6,
  power: 5,
  hp: 6,
  arena: 'ground',
  keywords: ['Support'],
  triggers: [
    {
      id: 'weaken',
      timing: 'defeated',
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
} as const satisfies UnitDefinition;
