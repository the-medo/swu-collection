import type { UnitDefinition } from '../definition.ts';

// ASH 102. Printed text is pinned in meta-movement fixture.
export const ravagerFinalImperialCommand = {
  cardId: 'ravager--final-imperial-command',
  name: 'Ravager, Final Imperial Command',
  kind: 'unit',
  aspects: ['Command', 'Villainy'],
  traits: ['Imperial', 'Vehicle', 'Capital Ship'],
  unique: true,
  cost: 9,
  power: 8,
  hp: 10,
  arena: 'space',
  restore: 2,
  triggers: [
    {
      id: 'on-friendly-played',
      timing: 'friendly-played',
      effects: [
        {
          kind: 'select-unit',
          bind: 'chosen',
          filter: {
            sameArenaAs: 'subject',
          },
          optional: true,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'damage',
                amount: {
                  kind: 'unit-stat',
                  target: 'subject',
                  stat: 'power',
                },
                source: 'subject',
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
