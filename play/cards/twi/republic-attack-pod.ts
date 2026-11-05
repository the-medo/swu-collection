import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteRepublicAttackPod = {
  cardId: 'republic-attack-pod',
  name: 'Republic Attack Pod',
  kind: 'unit',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Republic', 'Vehicle', 'Walker'],
  cost: 6,
  power: 6,
  hp: 7,
  arena: 'ground',
  costReductions: [
    {
      condition: {
        kind: 'units-at-least',
        filter: {
          controller: 'friendly',
        },
        amount: 3,
      },
      amount: 1,
    },
  ],
} as const satisfies UnitDefinition;
