import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteSugiHiredGuardian = {
  cardId: 'sugi--hired-guardian',
  name: 'Sugi, Hired Guardian',
  kind: 'unit',
  aspects: ['Vigilance', 'Vigilance'],
  traits: ['Underworld', 'Bounty Hunter'],
  cost: 4,
  unique: true,
  power: 4,
  hp: 6,
  arena: 'ground',
  smuggle: [
    {
      id: 'smuggle',
      cost: 6,
      aspects: ['Vigilance'],
    },
  ],
  constant: [
    {
      condition: {
        kind: 'units-at-least',
        filter: {
          controller: 'enemy',
          upgraded: true,
        },
        amount: 1,
      },
      abilities: {
        keywords: ['Sentinel'],
      },
    },
  ],
} as const satisfies UnitDefinition;
