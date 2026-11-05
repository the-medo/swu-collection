import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-foundations.json.
export const earlySetCloneHeavyGunner = {
  cardId: 'clone-heavy-gunner',
  name: 'Clone Heavy Gunner',
  kind: 'unit',
  aspects: ['Aggression'],
  traits: ['Republic', 'Clone', 'Trooper'],
  cost: 2,
  power: 1,
  hp: 3,
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
      power: 2,
      hp: 0,
    },
  ],
} as const satisfies UnitDefinition;
