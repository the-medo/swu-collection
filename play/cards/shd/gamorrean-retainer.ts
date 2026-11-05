import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-foundations.json.
export const earlySetGamorreanRetainer = {
  cardId: 'gamorrean-retainer',
  name: 'Gamorrean Retainer',
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Underworld'],
  cost: 2,
  power: 3,
  hp: 2,
  arena: 'ground',
  constant: [
    {
      condition: {
        kind: 'units-at-least',
        filter: {
          controller: 'friendly',
          anyAspect: ['Command'],
          otherThan: 'source',
        },
        amount: 1,
      },
      abilities: {
        keywords: ['Sentinel'],
      },
    },
  ],
} as const satisfies UnitDefinition;
