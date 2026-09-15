import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-foundations.json.
export const kinoLoyYouAnswerToMe = {
  cardId: 'kino-loy--you-answer-to-me',
  name: 'Kino Loy, You Answer to Me',
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Fringe'],
  unique: true,
  cost: 3,
  power: 1,
  hp: 5,
  arena: 'ground',
  constant: [
    {
      condition: {
        kind: 'always',
      },
      power: {
        kind: 'unit-count',
        filter: {
          controller: 'friendly',
          exhausted: true,
          otherThan: 'source',
        },
      },
    },
  ],
} as const satisfies UnitDefinition;
