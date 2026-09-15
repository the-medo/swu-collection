import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 observer fixture.
export const silverAngelTraceSHope = {
  cardId: 'silver-angel--trace-s-hope',
  name: "Silver Angel, Trace's Hope",
  kind: 'unit',
  aspects: ['Vigilance'],
  traits: ['Fringe', 'Vehicle', 'Transport'],
  unique: true,
  cost: 2,
  power: 2,
  hp: 3,
  arena: 'space',
  triggers: [
    {
      id: 'healed-damage',
      timing: 'healed',
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
