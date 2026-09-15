import type { LeaderDefinition } from '../definition.ts';

// Both printed faces are pinned in leader-foundations.json.
export const grandInquisitorHuntingTheJedi = {
  cardId: 'grand-inquisitor--hunting-the-jedi',
  name: 'Grand Inquisitor, Hunting the Jedi',
  kind: 'leader',
  aspects: ['Aggression', 'Villainy'],
  traits: ['Force', 'Imperial', 'Inquisitor'],
  unique: true,
  printedCost: 6,
  faces: {
    leader: {
      actions: [
        {
          id: 'leader-action',
          costs: [
            {
              kind: 'exhaust-self',
            },
          ],
          limit: null,
          effects: [
            {
              kind: 'select-unit',
              filter: {
                controller: 'friendly',
                powerAtMost: 3,
              },
              bind: 'chosen',
              optional: false,
              effects: [
                {
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'damage',
                    amount: 2,
                  },
                },
                {
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'ready',
                  },
                },
              ],
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
      hp: 6,
      arena: 'ground',
      triggers: [
        {
          id: 'attack',
          timing: 'attack',
          effects: [
            {
              kind: 'select-unit',
              filter: {
                controller: 'friendly',
                otherThan: 'source',
                powerAtMost: 3,
              },
              bind: 'chosen',
              optional: true,
              effects: [
                {
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'damage',
                    amount: 1,
                  },
                },
                {
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'ready',
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
