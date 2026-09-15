import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-foundations.json.
export const corruptPolitician = {
  cardId: 'corrupt-politician',
  name: 'Corrupt Politician',
  kind: 'unit',
  aspects: ['Command', 'Villainy'],
  traits: ['Republic', 'Official'],
  cost: 1,
  power: 2,
  hp: 2,
  arena: 'ground',
  constant: [
    {
      condition: {
        kind: 'more-units-than-opponent',
      },
      abilities: {
        keywords: ['Sentinel'],
      },
    },
  ],
} as const satisfies UnitDefinition;
