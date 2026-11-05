import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteClanChallengers = {
  cardId: 'clan-challengers',
  name: 'Clan Challengers',
  kind: 'unit',
  aspects: ['Aggression'],
  traits: ['Mandalorian', 'Trooper'],
  cost: 5,
  power: 3,
  hp: 6,
  arena: 'ground',
  raid: 3,
  constant: [
    {
      condition: {
        kind: 'unit-matches',
        target: 'source',
        filter: {
          upgraded: true,
        },
      },
      abilities: {
        keywords: ['Overwhelm'],
      },
    },
  ],
} as const satisfies UnitDefinition;
