import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteEmperorSRoyalGuard = {
  cardId: 'emperor-s-royal-guard',
  name: "Emperor's Royal Guard",
  kind: 'unit',
  aspects: ['Villainy', 'Command'],
  traits: ['Imperial'],
  cost: 3,
  power: 3,
  hp: 4,
  arena: 'ground',
  constant: [
    {
      condition: {
        kind: 'units-at-least',
        filter: {
          controller: 'friendly',
          trait: 'Official',
        },
        amount: 1,
      },
      abilities: {
        keywords: ['Sentinel'],
      },
    },
    {
      condition: {
        kind: 'controls-name',
        name: 'Emperor Palpatine',
      },
      hp: 1,
    },
  ],
} as const satisfies UnitDefinition;
