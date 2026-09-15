import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-foundations.json.
export const guardianOfTheWhills = {
  cardId: 'guardian-of-the-whills',
  name: 'Guardian of the Whills',
  kind: 'unit',
  aspects: ['Vigilance'],
  traits: ['Force', 'Fringe'],
  cost: 2,
  power: 2,
  hp: 2,
  arena: 'ground',
  playReductions: [
    {
      id: 'first-attached-upgrade',
      filter: {
        playAs: 'upgrade',
      },
      host: {
        sameAs: 'source',
      },
      amount: 1,
      firstEachRound: true,
    },
  ],
} as const satisfies UnitDefinition;
