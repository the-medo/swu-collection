import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-effects.json.
export const crosshairFilledWithDoubt = {
  cardId: 'crosshair--filled-with-doubt',
  name: 'Crosshair, Filled With Doubt',
  kind: 'unit',
  aspects: ['Aggression'],
  traits: ['Imperial', 'Clone', 'Trooper'],
  unique: true,
  cost: 2,
  power: 2,
  hp: 3,
  arena: 'ground',
  triggers: [
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'friendly',
            otherThan: 'source',
          },
          bind: 'chosen',
          optional: true,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'damage',
                amount: 1,
              },
              ifYouDo: [
                {
                  kind: 'damage-bases',
                  amount: 2,
                  targets: 'enemy',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
