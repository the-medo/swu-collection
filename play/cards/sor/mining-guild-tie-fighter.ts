import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteMiningGuildTieFighter = {
  cardId: 'mining-guild-tie-fighter',
  name: 'Mining Guild TIE Fighter',
  kind: 'unit',
  aspects: ['Cunning'],
  traits: ['Fringe', 'Vehicle', 'Fighter'],
  cost: 1,
  power: 1,
  hp: 2,
  arena: 'space',
  triggers: [
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'pay',
          costs: [
            {
              kind: 'resources',
              amount: 2,
            },
          ],
          optional: true,
          effects: [
            {
              kind: 'draw-cards',
              amount: 1,
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
