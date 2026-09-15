import type { LeaderDefinition } from '../definition.ts';

// Official faces and revised timing text are pinned in leader-phase-events.json.
export const bobaFettCollectingTheBounty = {
  cardId: 'boba-fett--collecting-the-bounty',
  name: 'Boba Fett, Collecting the Bounty',
  kind: 'leader',
  aspects: ['Cunning', 'Villainy'],
  traits: ['Underworld', 'Bounty Hunter'],
  unique: true,
  printedCost: 5,
  faces: {
    leader: {
      triggers: [
        {
          id: 'observe',
          timing: 'unit-left-play',
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
                  kind: 'select-resources',
                  player: 'self',
                  exhausted: 'any',
                  min: 1,
                  max: 1,
                  operation: 'ready',
                },
              ],
            },
          ],
          condition: {
            kind: 'unit-matches',
            target: 'subject',
            filter: {
              controller: 'enemy',
            },
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
      power: 4,
      hp: 7,
      arena: 'ground',
      triggers: [
        {
          id: 'observe',
          timing: 'attack-ended',
          effects: [
            {
              kind: 'select-resources',
              player: 'self',
              exhausted: 'any',
              min: 0,
              max: 2,
              operation: 'ready',
            },
          ],
          condition: {
            kind: 'all',
            conditions: [
              {
                kind: 'value-at-least',
                name: 'survived',
                amount: 1,
              },
              {
                kind: 'unit-history-at-least',
                event: 'left',
                amount: 1,
                player: 'enemy',
              },
            ],
          },
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;
