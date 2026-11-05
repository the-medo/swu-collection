import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteAtTeVanguard = {
  cardId: 'at-te-vanguard',
  name: 'AT-TE Vanguard',
  kind: 'unit',
  aspects: ['Heroism'],
  traits: ['Republic', 'Vehicle', 'Walker'],
  cost: 8,
  power: 6,
  hp: 9,
  arena: 'ground',
  restore: 3,
  triggers: [
    {
      id: 'defeated',
      timing: 'defeated',
      effects: [
        {
          kind: 'create-unit',
          cardId: 'clone-trooper',
          count: 2,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
