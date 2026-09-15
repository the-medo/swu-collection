import type { LeaderDefinition } from '../definition.ts';

// Official faces and revised timing text are pinned in leader-phase-events.json.
export const cassianAndorDedicatedToTheRebellion = {
  cardId: 'cassian-andor--dedicated-to-the-rebellion',
  name: 'Cassian Andor, Dedicated to the Rebellion',
  kind: 'leader',
  aspects: ['Aggression', 'Heroism'],
  traits: ['Rebel'],
  unique: true,
  printedCost: 6,
  faces: {
    leader: {
      actions: [
        {
          id: 'leader-action',
          costs: [
            {
              kind: 'resources',
              amount: 1,
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
                kind: 'numeric-at-least',
                value: {
                  kind: 'phase-count',
                  event: 'enemy-base-damage',
                  player: 'self',
                },
                amount: 3,
              },
              effects: [
                {
                  kind: 'draw-cards',
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
              condition: {
                kind: 'resources-at-least',
                amount: 6,
              },
              as: 'unit',
            },
          ],
        },
      ],
    },
    unit: {
      power: 4,
      hp: 6,
      arena: 'ground',
      keywords: ['Saboteur'],
      triggers: [
        {
          id: 'observe',
          timing: 'enemy-base-damage',
          effects: [
            {
              kind: 'draw-cards',
              amount: 1,
            },
          ],
          optional: true,
          limit: 'once-per-round',
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;
