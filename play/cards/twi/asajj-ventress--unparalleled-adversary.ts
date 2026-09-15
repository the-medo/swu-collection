import type { LeaderDefinition } from '../definition.ts';

// Printed faces and clarifications are pinned in leader-history.json.
export const asajjVentressUnparalleledAdversary = {
  cardId: 'asajj-ventress--unparalleled-adversary',
  name: 'Asajj Ventress, Unparalleled Adversary',
  kind: 'leader',
  aspects: ['Cunning', 'Villainy'],
  traits: ['Force', 'Separatist', 'Sith'],
  unique: true,
  printedCost: 4,
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
              kind: 'if',
              condition: {
                kind: 'played-card-this-phase',
                filter: {
                  kind: 'event',
                },
              },
              effects: [
                {
                  kind: 'attack-with-unit',
                  powerBonus: 1,
                },
              ],
              otherwise: [
                {
                  kind: 'attack-with-unit',
                  powerBonus: 0,
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
                amount: 4,
              },
            },
          ],
        },
      ],
    },
    unit: {
      power: 3,
      hp: 4,
      arena: 'ground',
      triggers: [
        {
          id: 'attack',
          timing: 'attack',
          effects: [
            {
              kind: 'if',
              condition: {
                kind: 'played-card-this-phase',
                filter: {
                  kind: 'event',
                },
              },
              effects: [
                {
                  kind: 'on-unit',
                  target: 'source',
                  operation: {
                    kind: 'modify',
                    power: 1,
                    hp: 0,
                    duration: 'attack',
                    abilities: {
                      firstCombatDamage: true,
                    },
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
