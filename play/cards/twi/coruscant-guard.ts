import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteCoruscantGuard = {
  cardId: 'coruscant-guard',
  name: 'Coruscant Guard',
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Republic', 'Clone', 'Trooper'],
  cost: 2,
  power: 3,
  hp: 2,
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
      abilities: {
        keywords: ['Ambush'],
      },
    },
  ],
} as const satisfies UnitDefinition;
