import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteVolunteerSoldier = {
  cardId: 'volunteer-soldier',
  name: 'Volunteer Soldier',
  kind: 'unit',
  aspects: [],
  traits: ['Trooper'],
  cost: 3,
  power: 2,
  hp: 3,
  arena: 'ground',
  raid: 1,
  costReductions: [
    {
      condition: {
        kind: 'units-at-least',
        filter: {
          controller: 'friendly',
          trait: 'Trooper',
        },
        amount: 1,
      },
      amount: 1,
    },
  ],
} as const satisfies UnitDefinition;
