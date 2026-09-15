import type { UnitDefinition } from '../definition.ts';

// ASH 148. Printed text is pinned in meta-hidden-zones fixture.
export const ninthSisterHulkingInquisitor = {
  cardId: 'ninth-sister--hulking-inquisitor',
  name: 'Ninth Sister, Hulking Inquisitor',
  kind: 'unit',
  aspects: ['Aggression', 'Villainy'],
  traits: ['Force', 'Imperial', 'Inquisitor'],
  cost: 7,
  unique: true,
  power: 8,
  hp: 7,
  arena: 'ground',
  keywords: ['Overwhelm'],
  triggers: [
    {
      id: 'on-played',
      timing: 'played',
      effects: [
        {
          kind: 'inspect-zone',
          zone: 'hand',
          player: 'enemy',
          chooser: 'owner',
          filter: {},
          min: 1,
          max: 1,
          bind: 'chosen-card',
          effects: [
            {
              kind: 'move-card',
              discardBy: 'owner',
              target: 'chosen-card',
              from: 'hand',
              to: 'discard',
              effects: [
                {
                  kind: 'divide-damage',
                  amount: {
                    kind: 'card-cost',
                    target: 'chosen-card',
                  },
                  filter: {},
                  optional: true,
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
