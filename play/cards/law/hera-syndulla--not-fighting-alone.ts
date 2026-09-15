import type { LeaderDefinition } from '../definition.ts';

// Printed faces and clarifications are pinned in leader-history.json.
export const heraSyndullaNotFightingAlone = {
  cardId: 'hera-syndulla--not-fighting-alone',
  name: 'Hera Syndulla, Not Fighting Alone',
  kind: 'leader',
  aspects: ['Command', 'Heroism'],
  traits: ['Rebel', "Twi'lek", 'Spectre'],
  unique: true,
  printedCost: 5,
  faces: {
    leader: {
      ignoreAspectPenalties: [
        {
          filter: {
            kind: 'unit',
            aspect: 'Heroism',
          },
          condition: {
            kind: 'units-at-least',
            filter: {
              controller: 'friendly',
            },
            amount: 2,
          },
        },
      ],
      actions: [
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
                amount: 5,
              },
            },
          ],
        },
      ],
    },
    unit: {
      power: 3,
      hp: 6,
      arena: 'ground',
      restore: 1,
      ignoreAspectPenalties: [
        {
          filter: {
            kind: 'unit',
            aspect: 'Heroism',
          },
          condition: {
            kind: 'units-at-least',
            filter: {
              controller: 'friendly',
            },
            amount: 2,
          },
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;
