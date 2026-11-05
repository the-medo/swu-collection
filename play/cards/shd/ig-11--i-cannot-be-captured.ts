import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteIg11ICannotBeCaptured = {
  cardId: 'ig-11--i-cannot-be-captured',
  name: 'IG-11, I Cannot Be Captured',
  kind: 'unit',
  aspects: ['Aggression'],
  traits: ['Droid', 'Bounty Hunter'],
  cost: 5,
  unique: true,
  power: 6,
  hp: 5,
  arena: 'ground',
  captureReplacement: [
    {
      kind: 'on-unit',
      target: 'source',
      operation: {
        kind: 'defeat',
      },
    },
    {
      kind: 'damage-units',
      filter: {
        controller: 'enemy',
        arena: 'ground',
      },
      amount: 3,
    },
  ],
  triggers: [
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            arena: 'ground',
            damaged: true,
          },
          optional: true,
          bind: 'chosen',
          effects: [
            {
              kind: 'damage-target',
              target: 'chosen',
              amount: 3,
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
