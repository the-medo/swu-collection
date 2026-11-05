import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteOutspokenRepresentative = {
  cardId: 'outspoken-representative',
  name: 'Outspoken Representative',
  kind: 'unit',
  aspects: ['Vigilance', 'Heroism'],
  traits: ['Republic', 'Official'],
  cost: 2,
  power: 0,
  hp: 3,
  arena: 'ground',
  constant: [
    {
      condition: {
        kind: 'units-at-least',
        filter: {
          controller: 'friendly',
          trait: 'Republic',
          otherThan: 'source',
        },
        amount: 1,
      },
      abilities: {
        keywords: ['Sentinel'],
      },
    },
  ],
  triggers: [
    {
      id: 'defeated',
      timing: 'defeated',
      effects: [
        {
          kind: 'create-unit',
          cardId: 'clone-trooper',
          count: 1,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
