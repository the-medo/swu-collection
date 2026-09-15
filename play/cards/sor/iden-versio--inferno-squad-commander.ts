import type { LeaderDefinition } from '../definition.ts';

// Printed faces and clarifications are pinned in leader-history.json.
export const idenVersioInfernoSquadCommander = {
  cardId: 'iden-versio--inferno-squad-commander',
  name: 'Iden Versio, Inferno Squad Commander',
  kind: 'leader',
  aspects: ['Vigilance', 'Villainy'],
  traits: ['Imperial', 'Trooper'],
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
                player: 'enemy',
                amount: 1,
              },
              effects: [
                {
                  kind: 'heal-own-base',
                  amount: 1,
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
      power: 4,
      hp: 4,
      arena: 'ground',
      keywords: ['Shielded'],
      triggers: [
        {
          id: 'enemy-defeated',
          timing: 'enemy-defeated',
          effects: [
            {
              kind: 'heal-own-base',
              amount: 1,
            },
          ],
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;
