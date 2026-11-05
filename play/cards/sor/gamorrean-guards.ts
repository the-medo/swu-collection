import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteGamorreanGuards = {
  cardId: 'gamorrean-guards',
  name: 'Gamorrean Guards',
  kind: 'unit',
  aspects: ['Cunning'],
  traits: ['Underworld'],
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
          anyAspect: ['Cunning'],
        },
        amount: 1,
      },
      abilities: {
        keywords: ['Sentinel'],
      },
    },
  ],
} as const satisfies UnitDefinition;
