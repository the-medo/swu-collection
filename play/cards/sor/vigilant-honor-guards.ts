import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteVigilantHonorGuards = {
  cardId: 'vigilant-honor-guards',
  name: 'Vigilant Honor Guards',
  kind: 'unit',
  aspects: ['Heroism', 'Vigilance'],
  traits: ['Rebel'],
  cost: 5,
  power: 4,
  hp: 6,
  arena: 'ground',
  constant: [
    {
      condition: {
        kind: 'unit-matches',
        target: 'source',
        filter: {
          damaged: false,
        },
      },
      abilities: {
        keywords: ['Sentinel'],
      },
    },
  ],
} as const satisfies UnitDefinition;
