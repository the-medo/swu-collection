import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteWedgeAntillesStarOfTheRebellion = {
  cardId: 'wedge-antilles--star-of-the-rebellion',
  name: 'Wedge Antilles, Star of the Rebellion',
  kind: 'unit',
  aspects: ['Command', 'Heroism'],
  traits: ['Rebel'],
  cost: 5,
  unique: true,
  power: 5,
  hp: 5,
  arena: 'ground',
  auras: [
    {
      id: 'aura',
      filter: {
        controller: 'friendly',
        trait: 'Vehicle',
      },
      power: 1,
      hp: 1,
      abilities: {
        keywords: ['Ambush'],
      },
    },
  ],
} as const satisfies UnitDefinition;
