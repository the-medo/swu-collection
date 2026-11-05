import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompletePartisanInsurgent = {
  cardId: 'partisan-insurgent',
  name: 'Partisan Insurgent',
  kind: 'unit',
  aspects: ['Aggression'],
  traits: ['Rebel', 'Trooper'],
  cost: 2,
  power: 1,
  hp: 4,
  arena: 'ground',
  constant: [
    {
      condition: {
        kind: 'units-at-least',
        filter: {
          controller: 'friendly',
          otherThan: 'source',
          anyAspect: ['Aggression'],
        },
        amount: 1,
      },
      raid: 2,
    },
  ],
} as const satisfies UnitDefinition;
