import type { LeaderDefinition } from '../definition.ts';

// Printed faces and clarifications are pinned in leader-history.json.
export const heraSyndullaSpectreTwo = {
  cardId: 'hera-syndulla--spectre-two',
  name: 'Hera Syndulla, Spectre Two',
  kind: 'leader',
  aspects: ['Command', 'Heroism'],
  traits: ['Rebel', "Twi'lek", 'Spectre'],
  unique: true,
  printedCost: 6,
  faces: {
    leader: {
      ignoreAspectPenalties: [
        {
          filter: {
            trait: 'Spectre',
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
                amount: 6,
              },
            },
          ],
        },
      ],
    },
    unit: {
      power: 4,
      hp: 6,
      arena: 'ground',
      ignoreAspectPenalties: [
        {
          filter: {
            trait: 'Spectre',
          },
        },
      ],
      triggers: [
        {
          id: 'attack',
          timing: 'attack',
          effects: [
            {
              kind: 'select-unit',
              filter: {
                unique: true,
                otherThan: 'source',
              },
              bind: 'chosen',
              optional: true,
              effects: [
                {
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'give-token',
                    token: 'experience',
                    count: 1,
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;
