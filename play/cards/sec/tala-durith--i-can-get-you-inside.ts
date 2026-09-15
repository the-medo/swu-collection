import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-foundations.json.
export const talaDurithICanGetYouInside = {
  cardId: 'tala-durith--i-can-get-you-inside',
  name: 'Tala Durith, I Can Get You Inside',
  kind: 'unit',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Imperial', 'Rebel'],
  unique: true,
  cost: 3,
  power: 3,
  hp: 3,
  arena: 'ground',
  keywords: ['Plot'],
  auras: [
    {
      id: 'covert-allies',
      filter: {
        controller: 'friendly',
        otherThan: 'source',
      },
      abilities: {
        keywords: ['Hidden'],
      },
    },
  ],
} as const satisfies UnitDefinition;
