import type { LeaderDefinition } from '../definition.ts';

// Official text and clarifications are pinned in leader-resource-repayment.json.
export const hanSoloAudaciousSmuggler = {
  cardId: 'han-solo--audacious-smuggler',
  name: 'Han Solo, Audacious Smuggler',
  kind: 'leader',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Underworld'],
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
              kind: 'inspect-zone',
              zone: 'hand',
              player: 'self',
              chooser: 'self',
              filter: {},
              min: 1,
              max: 1,
              bind: 'first',
              group: 'resourced',
              effects: [
                {
                  kind: 'resource-cards',
                  group: 'resourced',
                  ready: true,
                  countAs: 'resourced-count',
                  effects: [],
                },
              ],
            },
            {
              kind: 'schedule-resource-repayment',
              at: 'next-action',
              amount: 1,
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
      hp: 6,
      arena: 'ground',
      triggers: [
        {
          id: 'attack',
          timing: 'attack',
          effects: [
            {
              kind: 'resource-top',
              optional: false,
              ready: true,
            },
            {
              kind: 'schedule-resource-repayment',
              at: 'next-action',
              amount: 1,
            },
          ],
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;
