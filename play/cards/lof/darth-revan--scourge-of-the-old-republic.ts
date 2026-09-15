import type { LeaderDefinition } from '../definition.ts';

// Printed faces and revised official text are pinned in leader-reactions.json.
export const darthRevanScourgeOfTheOldRepublic = {
  cardId: 'darth-revan--scourge-of-the-old-republic',
  name: 'Darth Revan, Scourge of the Old Republic',
  kind: 'leader',
  aspects: ['Villainy'],
  traits: ['Force', 'Sith'],
  unique: true,
  printedCost: 5,
  faces: {
    leader: {
      triggers: [
        {
          id: 'observe',
          timing: 'friendly-attack-ended',
          effects: [
            {
              kind: 'pay',
              costs: [
                {
                  kind: 'exhaust-self',
                },
              ],
              optional: true,
              effects: [
                {
                  kind: 'on-unit',
                  target: 'subject',
                  operation: {
                    kind: 'give-token',
                    token: 'experience',
                    count: 1,
                  },
                },
              ],
            },
          ],
          condition: {
            kind: 'value-at-least',
            name: 'defender-defeated',
            amount: 1,
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
              condition: {
                kind: 'resources-at-least',
                amount: 5,
              },
              as: 'unit',
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
      triggers: [
        {
          id: 'observe',
          timing: 'friendly-attack-ended',
          effects: [
            {
              kind: 'on-unit',
              target: 'subject',
              operation: {
                kind: 'give-token',
                token: 'experience',
                count: 1,
              },
            },
          ],
          condition: {
            kind: 'value-at-least',
            name: 'defender-defeated',
            amount: 1,
          },
          optional: true,
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;
