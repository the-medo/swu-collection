import type { LeaderDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 observer fixture.
export const bobaFettKraytSClawCommander = {
  cardId: 'boba-fett--krayt-s-claw-commander',
  name: "Boba Fett, Krayt's Claw Commander",
  kind: 'leader',
  aspects: ['Command', 'Villainy'],
  traits: ['Underworld', 'Bounty Hunter'],
  unique: true,
  printedCost: 5,
  faces: {
    leader: {
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
      triggers: [
        {
          id: 'combat-credit',
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
                  kind: 'create-credits',
                  amount: 1,
                },
              ],
            },
          ],
          condition: {
            kind: 'all',
            conditions: [
              {
                kind: 'value-at-least',
                name: 'defender-defeated',
                amount: 1,
              },
              {
                kind: 'unit-had-trait',
                target: 'subject',
                trait: 'Bounty Hunter',
              },
            ],
          },
        },
      ],
    },
    unit: {
      power: 3,
      hp: 6,
      arena: 'ground',
      raid: 1,
      triggers: [
        {
          id: 'combat-credit',
          timing: 'friendly-attack-ended',
          effects: [
            {
              kind: 'create-credits',
              amount: 1,
            },
          ],
          condition: {
            kind: 'all',
            conditions: [
              {
                kind: 'value-at-least',
                name: 'defender-defeated',
                amount: 1,
              },
              {
                kind: 'unit-had-trait',
                target: 'subject',
                trait: 'Bounty Hunter',
              },
            ],
          },
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;
