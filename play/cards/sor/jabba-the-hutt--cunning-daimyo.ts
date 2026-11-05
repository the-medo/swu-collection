import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteJabbaTheHuttCunningDaimyo = {
  cardId: 'jabba-the-hutt--cunning-daimyo',
  name: 'Jabba the Hutt, Cunning Daimyo',
  kind: 'unit',
  aspects: ['Cunning', 'Villainy'],
  traits: ['Underworld', 'Hutt'],
  cost: 4,
  unique: true,
  power: 2,
  hp: 8,
  arena: 'ground',
  playReductions: [
    {
      id: 'tricks',
      filter: {
        kind: 'event',
        trait: 'Trick',
      },
      amount: 1,
    },
  ],
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'search-deck',
          count: 8,
          max: 1,
          filter: 'event',
          trait: 'Trick',
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
