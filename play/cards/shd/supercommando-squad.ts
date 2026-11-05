import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteSupercommandoSquad = {
  cardId: 'supercommando-squad',
  name: 'Supercommando Squad',
  kind: 'unit',
  aspects: ['Villainy', 'Vigilance'],
  traits: ['Imperial', 'Mandalorian', 'Trooper'],
  cost: 5,
  power: 4,
  hp: 4,
  arena: 'ground',
  keywords: ['Shielded'],
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
        keywords: ['Sentinel'],
      },
    },
  ],
} as const satisfies UnitDefinition;
