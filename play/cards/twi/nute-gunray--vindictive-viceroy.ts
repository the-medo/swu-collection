import type { LeaderDefinition } from '../definition.ts';

// Printed faces and clarifications are pinned in leader-history.json.
export const nuteGunrayVindictiveViceroy = {
  cardId: 'nute-gunray--vindictive-viceroy',
  name: 'Nute Gunray, Vindictive Viceroy',
  kind: 'leader',
  aspects: ['Villainy', 'Vigilance'],
  traits: ['Separatist', 'Official'],
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
              kind: 'if',
              condition: {
                kind: 'unit-history-at-least',
                event: 'defeated',
                player: 'self',
                amount: 2,
              },
              effects: [
                {
                  kind: 'create-unit',
                  cardId: 'battle-droid',
                  count: 1,
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
      power: 2,
      hp: 8,
      arena: 'ground',
      triggers: [
        {
          id: 'attack',
          timing: 'attack',
          effects: [
            {
              kind: 'create-unit',
              cardId: 'battle-droid',
              count: 1,
            },
          ],
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;
