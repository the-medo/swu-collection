import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 conditional ability fixture.
export const thePurrgilKingLeadingTheJourney = {
  cardId: 'the-purrgil-king--leading-the-journey',
  name: 'The Purrgil King, Leading The Journey',
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Creature'],
  unique: true,
  cost: 8,
  power: 4,
  hp: 12,
  arena: 'space',
  restore: 4,
  triggers: [
    {
      id: 'draw',
      timing: 'played',
      effects: [
        {
          kind: 'draw-cards',
          amount: {
            kind: 'unit-count',
            filter: {
              controller: 'friendly',
              remainingHpAtLeast: 7,
            },
          },
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
