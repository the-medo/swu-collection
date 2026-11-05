import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteSeasonedShoretrooper = {
  cardId: 'seasoned-shoretrooper',
  name: 'Seasoned Shoretrooper',
  kind: 'unit',
  aspects: ['Command', 'Villainy'],
  traits: ['Imperial', 'Trooper'],
  cost: 2,
  power: 2,
  hp: 3,
  arena: 'ground',
  constant: [
    {
      condition: {
        kind: 'numeric-at-least',
        value: {
          kind: 'zone-size',
          zone: 'resources',
          player: 'self',
        },
        amount: 6,
      },
      power: 2,
    },
  ],
} as const satisfies UnitDefinition;
