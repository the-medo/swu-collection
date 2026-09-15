import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-keywords.json.
export const theGhostHeartOfTheFamily = {
  cardId: 'the-ghost--heart-of-the-family',
  name: 'The Ghost, Heart of the Family',
  kind: 'unit',
  aspects: ['Vigilance', 'Heroism'],
  traits: ['Rebel', 'Vehicle', 'Transport', 'Spectre'],
  unique: true,
  cost: 5,
  power: 5,
  hp: 6,
  arena: 'space',
  auras: [
    {
      id: 'family-keywords',
      filter: {
        controller: 'friendly',
        trait: 'Spectre',
        otherThan: 'source',
      },
      keywordsFromSource: true,
    },
  ],
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
