import type { UnitDefinition } from '../definition.ts';

// ASH 097. Printed text is pinned in meta-hidden-zones fixture.
export const moffGideonRemnantCommander = {
  cardId: 'moff-gideon--remnant-commander',
  name: 'Moff Gideon, Remnant Commander',
  kind: 'unit',
  aspects: ['Command', 'Villainy'],
  traits: ['Imperial', 'Official'],
  cost: 3,
  unique: true,
  power: 2,
  hp: 5,
  arena: 'ground',
  keywords: ['Sentinel'],
  triggers: [
    {
      id: 'on-defeated',
      timing: 'defeated',
      effects: [
        {
          kind: 'inspect-zone',
          zone: 'discard',
          player: 'self',
          chooser: 'self',
          filter: {
            kind: 'unit',
            unique: false,
            trait: 'Imperial',
          },
          min: 0,
          max: 1,
          bind: 'chosen-card',
          effects: [
            {
              kind: 'move-card',
              target: 'chosen-card',
              from: 'discard',
              to: 'hand',
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
