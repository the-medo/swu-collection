import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteCloneDiveTrooper = {
  cardId: 'clone-dive-trooper',
  name: 'Clone Dive Trooper',
  kind: 'unit',
  aspects: ['Cunning'],
  traits: ['Republic', 'Clone', 'Trooper'],
  cost: 1,
  power: 2,
  hp: 1,
  arena: 'ground',
  keywords: ['Coordinate'],
  auras: [
    {
      id: 'aura',
      filter: {
        defendingAgainst: {
          sameAs: 'source',
        },
        condition: {
          kind: 'units-at-least',
          filter: {
            controller: 'friendly',
          },
          amount: 3,
        },
      },
      power: -2,
    },
  ],
} as const satisfies UnitDefinition;
