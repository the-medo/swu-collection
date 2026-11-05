import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteBoKatanKryzeDeathWatchLieutenant = {
  cardId: 'bo-katan-kryze--death-watch-lieutenant',
  name: 'Bo-Katan Kryze, Death Watch Lieutenant',
  kind: 'unit',
  aspects: ['Aggression', 'Villainy'],
  traits: ['Mandalorian', 'Trooper'],
  cost: 2,
  unique: true,
  power: 2,
  hp: 3,
  arena: 'ground',
  constant: [
    {
      condition: {
        kind: 'units-at-least',
        filter: {
          controller: 'friendly',
          otherThan: 'source',
          trait: 'Mandalorian',
        },
        amount: 1,
      },
      abilities: {
        keywords: ['Overwhelm', 'Saboteur'],
      },
    },
    {
      condition: {
        kind: 'units-at-least',
        filter: {
          controller: 'friendly',
          otherThan: 'source',
          trait: 'Trooper',
        },
        amount: 1,
      },
      power: 1,
    },
  ],
} as const satisfies UnitDefinition;
