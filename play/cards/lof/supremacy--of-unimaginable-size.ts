import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-foundations.json.
export const supremacyOfUnimaginableSize = {
  cardId: 'supremacy--of-unimaginable-size',
  name: 'Supremacy, Of Unimaginable Size',
  kind: 'unit',
  aspects: ['Command', 'Villainy'],
  traits: ['First Order', 'Vehicle', 'Capital Ship'],
  unique: true,
  cost: 12,
  power: 12,
  hp: 12,
  arena: 'space',
  keywords: ['Ambush'],
  auras: [
    {
      id: 'vast-escort',
      filter: {
        controller: 'friendly',
        trait: 'Vehicle',
        otherThan: 'source',
      },
      power: 6,
      hp: 6,
    },
  ],
} as const satisfies UnitDefinition;
