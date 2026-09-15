import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-foundations.json.
export const warriorOfClanKryze = {
  cardId: 'warrior-of-clan-kryze',
  name: 'Warrior of Clan Kryze',
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Mandalorian', 'Trooper'],
  cost: 2,
  power: 2,
  hp: 3,
  arena: 'ground',
  constant: [
    {
      condition: {
        kind: 'units-at-least',
        filter: {
          controller: 'friendly',
          exhausted: true,
          otherThan: 'source',
        },
        amount: 1,
      },
      abilities: {
        keywords: ['Sentinel'],
      },
    },
  ],
} as const satisfies UnitDefinition;
