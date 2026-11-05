import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteRepublicDefenseCarrier = {
  cardId: 'republic-defense-carrier',
  name: 'Republic Defense Carrier',
  kind: 'unit',
  aspects: ['Command', 'Heroism'],
  traits: ['Republic', 'Vehicle', 'Capital Ship'],
  cost: 11,
  power: 6,
  hp: 7,
  arena: 'space',
  keywords: ['Sentinel'],
  costReductions: [
    {
      condition: {
        kind: 'always',
      },
      amount: {
        kind: 'unit-count',
        filter: {
          controller: 'enemy',
        },
      },
    },
  ],
} as const satisfies UnitDefinition;
