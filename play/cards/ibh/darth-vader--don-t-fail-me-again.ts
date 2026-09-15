import type { LeaderDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 conditional ability fixture.
export const darthVaderDonTFailMeAgain = {
  cardId: 'darth-vader--don-t-fail-me-again',
  name: "Darth Vader, Don't Fail Me Again",
  kind: 'leader',
  aspects: ['Aggression', 'Villainy'],
  traits: ['Force', 'Imperial', 'Sith'],
  unique: true,
  printedCost: 6,
  faces: {
    leader: {
      actions: [
        {
          id: 'damage-base',
          costs: [
            {
              kind: 'resources',
              amount: 1,
            },
            {
              kind: 'exhaust-self',
            },
          ],
          limit: null,
          effects: [
            {
              kind: 'damage-base',
              amount: 1,
            },
          ],
        },
        {
          id: 'deploy',
          costs: [],
          limit: 'once-per-game',
          effects: [
            {
              kind: 'deploy',
              as: 'unit',
              condition: {
                kind: 'resources-at-least',
                amount: 6,
              },
            },
          ],
        },
      ],
    },
    unit: {
      power: 3,
      hp: 8,
      arena: 'ground',
      triggers: [
        {
          id: 'damage-base',
          timing: 'attack',
          effects: [
            {
              kind: 'damage-base',
              amount: 2,
            },
          ],
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;
