import type { LeaderDefinition } from '../definition.ts';

// Printed roles and official clarifications are pinned in leader-combat.json.
export const grandInquisitorStoriesTravelQuickly = {
  cardId: 'grand-inquisitor--stories-travel-quickly',
  name: 'Grand Inquisitor, Stories Travel Quickly',
  kind: 'leader',
  aspects: ['Cunning', 'Villainy'],
  traits: ['Force', 'Imperial', 'Inquisitor'],
  unique: true,
  printedCost: 5,
  faces: {
    leader: {
      actions: [
        {
          id: 'leader-action',
          costs: [
            {
              kind: 'exhaust-self',
            },
            {
              kind: 'force',
            },
          ],
          limit: null,
          effects: [
            {
              kind: 'select-unit',
              filter: {
                controller: 'friendly',
              },
              effects: [
                {
                  kind: 'attack-bound',
                  target: 'chosen',
                  optional: false,
                  defenderPowerModifier: -2,
                },
              ],
              optional: false,
              bind: 'chosen',
              forAttack: {},
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
                amount: 5,
              },
            },
          ],
        },
      ],
    },
    unit: {
      power: 3,
      hp: 5,
      arena: 'ground',
      keywords: ['Shielded'],
      triggers: [
        {
          id: 'attack',
          timing: 'attack',
          effects: [
            {
              kind: 'on-unit',
              target: 'defender',
              operation: {
                kind: 'modify',
                power: -2,
                hp: 0,
                duration: 'attack',
              },
            },
          ],
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;
