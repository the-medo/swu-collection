import type { UnitDefinition } from '../definition.ts';

// ASH 072. Printed text is pinned in meta-board fixture.
export const doctorPershingDedicatedToResearch = {
  cardId: 'doctor-pershing--dedicated-to-research',
  name: 'Doctor Pershing, Dedicated to Research',
  kind: 'unit',
  aspects: ['Vigilance'],
  traits: ['New Republic'],
  unique: true,
  cost: 2,
  power: 0,
  hp: 4,
  arena: 'ground',
  keywords: ['Support'],
  triggers: [
    {
      id: 'on-attack',
      timing: 'attack',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'unit-matches',
            target: 'source',
            filter: {
              remainingHpAtLeast: 3,
            },
          },
          effects: [
            {
              kind: 'draw-cards',
              amount: 1,
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
