import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteReputableHunter = {
  cardId: 'reputable-hunter',
  name: 'Reputable Hunter',
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Bounty Hunter'],
  cost: 3,
  power: 3,
  hp: 4,
  arena: 'ground',
  costReductions: [
    {
      condition: {
        kind: 'units-at-least',
        filter: {
          controller: 'enemy',
          hasBounty: true,
        },
        amount: 1,
      },
      amount: 1,
    },
  ],
} as const satisfies UnitDefinition;
