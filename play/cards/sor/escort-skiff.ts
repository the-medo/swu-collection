import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteEscortSkiff = {
  cardId: 'escort-skiff',
  name: 'Escort Skiff',
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Underworld', 'Vehicle', 'Speeder'],
  cost: 4,
  power: 4,
  hp: 4,
  arena: 'ground',
  constant: [
    {
      condition: {
        kind: 'units-at-least',
        filter: {
          controller: 'friendly',
          otherThan: 'source',
          anyAspect: ['Command'],
        },
        amount: 1,
      },
      abilities: {
        keywords: ['Ambush'],
      },
    },
  ],
} as const satisfies UnitDefinition;
