import type { LeaderDefinition } from '../definition.ts';

// Printed faces and clarifications are pinned in leader-history.json.
export const captainRexFightingForHisBrothers = {
  cardId: 'captain-rex--fighting-for-his-brothers',
  name: 'Captain Rex, Fighting For His Brothers',
  kind: 'leader',
  aspects: ['Command', 'Heroism'],
  traits: ['Republic', 'Clone', 'Trooper'],
  unique: true,
  printedCost: 5,
  faces: {
    leader: {
      actions: [
        {
          id: 'leader-action',
          costs: [
            {
              kind: 'resources',
              amount: 2,
            },
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
                event: 'attacked',
                player: 'self',
                amount: 1,
              },
              effects: [
                {
                  kind: 'create-unit',
                  cardId: 'clone-trooper',
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
                amount: 5,
              },
            },
          ],
        },
      ],
    },
    unit: {
      power: 2,
      hp: 6,
      arena: 'ground',
      triggers: [
        {
          id: 'deployed',
          timing: 'deployed',
          effects: [
            {
              kind: 'create-unit',
              cardId: 'clone-trooper',
              count: 1,
            },
          ],
        },
      ],
      auras: [
        {
          id: 'troopers',
          filter: {
            controller: 'friendly',
            trait: 'Trooper',
            otherThan: 'source',
          },
          hp: 1,
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;
