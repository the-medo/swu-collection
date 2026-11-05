import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteAdmiralYularenAdvisingCaution = {
  cardId: 'admiral-yularen--advising-caution',
  name: 'Admiral Yularen, Advising Caution',
  kind: 'unit',
  aspects: ['Command', 'Heroism'],
  traits: ['Republic', 'Official'],
  cost: 3,
  unique: true,
  power: 2,
  hp: 5,
  arena: 'ground',
  restore: 1,
  auras: [
    {
      id: 'aura',
      filter: {
        controller: 'friendly',
        otherThan: 'source',
        anyAspect: ['Heroism'],
      },
      hp: 1,
    },
  ],
} as const satisfies UnitDefinition;
