import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-attributes.json.
export const obiWanKenobiProtectorOfFelucia = {
  cardId: 'obi-wan-kenobi--protector-of-felucia',
  name: 'Obi-Wan Kenobi, Protector of Felucia',
  kind: 'unit',
  aspects: ['Vigilance', 'Command', 'Heroism'],
  traits: ['Force', 'Jedi', 'Republic'],
  unique: true,
  cost: 7,
  power: 7,
  hp: 7,
  arena: 'ground',
  keywords: ['Sentinel'],
  printedStats: [
    {
      condition: {
        kind: 'units-at-least',
        filter: {
          controller: 'friendly',
        },
        amount: 7,
      },
      filter: {
        controller: 'friendly',
      },
      power: 7,
      hp: 7,
    },
  ],
} as const satisfies UnitDefinition;
