import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteHevyStaunchMartyr = {
  cardId: 'hevy--staunch-martyr',
  name: 'Hevy, Staunch Martyr',
  kind: 'unit',
  aspects: ['Aggression'],
  traits: ['Republic', 'Clone', 'Trooper'],
  cost: 4,
  unique: true,
  power: 4,
  hp: 4,
  arena: 'ground',
  keywords: ['Coordinate'],
  constant: [
    {
      condition: {
        kind: 'units-at-least',
        filter: {
          controller: 'friendly',
        },
        amount: 3,
      },
      raid: 2,
    },
  ],
  triggers: [
    {
      id: 'defeated',
      timing: 'defeated',
      effects: [
        {
          kind: 'damage-units',
          filter: {
            controller: 'enemy',
            arena: 'ground',
          },
          amount: 1,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
