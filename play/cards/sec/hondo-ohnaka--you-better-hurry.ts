import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-foundations.json.
export const hondoOhnakaYouBetterHurry = {
  cardId: 'hondo-ohnaka--you-better-hurry',
  name: 'Hondo Ohnaka, You Better Hurry',
  kind: 'unit',
  aspects: ['Aggression', 'Villainy'],
  traits: ['Underworld'],
  unique: true,
  cost: 6,
  power: 6,
  hp: 5,
  arena: 'ground',
  keywords: ['Plot'],
  auras: [
    {
      id: 'crew-raid',
      filter: {
        controller: 'friendly',
        otherThan: 'source',
      },
      abilities: {
        raid: 1,
      },
    },
  ],
} as const satisfies UnitDefinition;
