import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteRelentlessRocketDroid = {
  cardId: 'relentless-rocket-droid',
  name: 'Relentless Rocket Droid',
  kind: 'unit',
  aspects: ['Aggression'],
  traits: ['Separatist', 'Droid', 'Trooper'],
  cost: 4,
  power: 3,
  hp: 5,
  arena: 'ground',
  constant: [
    {
      condition: {
        kind: 'units-at-least',
        filter: {
          controller: 'friendly',
          trait: 'Trooper',
          otherThan: 'source',
        },
        amount: 1,
      },
      power: 2,
    },
  ],
} as const satisfies UnitDefinition;
