import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteBazeMalbusTempleGuardian = {
  cardId: 'baze-malbus--temple-guardian',
  name: 'Baze Malbus, Temple Guardian',
  kind: 'unit',
  aspects: ['Vigilance'],
  traits: ['Fringe'],
  cost: 4,
  unique: true,
  power: 2,
  hp: 5,
  arena: 'ground',
  keywords: ['Grit'],
  constant: [
    {
      condition: {
        kind: 'initiative',
      },
      abilities: {
        keywords: ['Sentinel'],
      },
    },
  ],
} as const satisfies UnitDefinition;
