import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteCloneCommanderCodyCommandingThe212Th = {
  cardId: 'clone-commander-cody--commanding-the-212th',
  name: 'Clone Commander Cody, Commanding the 212th',
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Republic', 'Clone', 'Trooper'],
  cost: 5,
  unique: true,
  power: 4,
  hp: 4,
  arena: 'ground',
  keywords: ['Overwhelm', 'Coordinate'],
  auras: [
    {
      id: 'aura',
      filter: {
        controller: 'friendly',
        otherThan: 'source',
        condition: {
          kind: 'units-at-least',
          filter: {
            controller: 'friendly',
          },
          amount: 3,
        },
      },
      power: 1,
      hp: 1,
      abilities: {
        keywords: ['Overwhelm'],
      },
    },
  ],
} as const satisfies UnitDefinition;
