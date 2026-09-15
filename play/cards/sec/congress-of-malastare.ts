import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-foundations.json.
export const congressOfMalastare = {
  cardId: 'congress-of-malastare',
  name: 'Congress of Malastare',
  kind: 'unit',
  aspects: ['Vigilance'],
  traits: ['Republic', 'Official'],
  cost: 5,
  power: 5,
  hp: 5,
  arena: 'ground',
  playReductions: [
    {
      id: 'first-upgrade',
      filter: {
        playAs: 'upgrade',
      },
      amount: 1,
      firstEachPhase: true,
    },
  ],
} as const satisfies UnitDefinition;
