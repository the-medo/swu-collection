import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteYodaOldMaster = {
  cardId: 'yoda--old-master',
  name: 'Yoda, Old Master',
  kind: 'unit',
  aspects: ['Vigilance', 'Heroism'],
  traits: ['Force', 'Jedi'],
  cost: 3,
  unique: true,
  power: 2,
  hp: 4,
  arena: 'ground',
  restore: 2,
  triggers: [
    {
      id: 'defeated',
      timing: 'defeated',
      effects: [
        {
          kind: 'choose-mode',
          options: [
            {
              id: 'none',
              effects: [],
            },
            {
              id: 'self',
              effects: [
                {
                  kind: 'draw-cards',
                  amount: 1,
                },
              ],
            },
            {
              id: 'enemy',
              effects: [
                {
                  kind: 'draw-cards',
                  amount: 1,
                  player: 'enemy',
                },
              ],
            },
            {
              id: 'both',
              effects: [
                {
                  kind: 'draw-cards',
                  amount: 1,
                },
                {
                  kind: 'draw-cards',
                  amount: 1,
                  player: 'enemy',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
