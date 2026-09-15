import type { UnitDefinition } from '../definition.ts';

// ASH 220. Printed text is pinned in meta-hidden-zones fixture.
export const remnantLookouts = {
  cardId: 'remnant-lookouts',
  name: 'Remnant Lookouts',
  kind: 'unit',
  aspects: ['Cunning'],
  traits: ['Imperial', 'Trooper'],
  cost: 3,
  power: 3,
  hp: 3,
  arena: 'ground',
  triggers: [
    {
      id: 'on-played',
      timing: 'played',
      effects: [
        {
          kind: 'inspect-zone',
          zone: 'hand',
          player: 'enemy',
          chooser: 'self',
          filter: {},
          min: 0,
          max: 1,
          bind: 'chosen-card',
          effects: [
            {
              kind: 'move-card',
              target: 'chosen-card',
              from: 'hand',
              to: 'discard',
              effects: [
                {
                  kind: 'draw-cards',
                  amount: 1,
                  player: 'enemy',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
