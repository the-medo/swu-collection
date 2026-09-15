import type { UnitDefinition } from '../definition.ts';

// LAW 193. Printed text is pinned in meta-hidden-zones fixture.
export const midRimSharpshooter = {
  cardId: 'mid-rim-sharpshooter',
  name: 'Mid Rim Sharpshooter',
  kind: 'unit',
  aspects: ['Aggression'],
  traits: ['Underworld'],
  cost: 3,
  power: 3,
  hp: 3,
  arena: 'ground',
  keywords: ['Saboteur'],
  triggers: [
    {
      id: 'on-played',
      timing: 'played',
      effects: [
        {
          kind: 'pay',
          costs: [
            {
              kind: 'resources',
              amount: 1,
            },
          ],
          optional: true,
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
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
