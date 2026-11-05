import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteKuiilIHaveSpoken = {
  cardId: 'kuiil--i-have-spoken',
  name: 'Kuiil, I Have Spoken',
  kind: 'unit',
  aspects: ['Heroism', 'Vigilance'],
  traits: ['Fringe'],
  cost: 2,
  unique: true,
  power: 2,
  hp: 3,
  arena: 'ground',
  restore: 1,
  triggers: [
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'mill',
          player: 'self',
          count: 1,
          bind: 'milled',
          effects: [
            {
              kind: 'if',
              condition: {
                kind: 'card-matches',
                target: 'milled',
                filter: {
                  sharesAspectWith: 'own-base',
                },
              },
              effects: [
                {
                  kind: 'move-card',
                  target: 'milled',
                  from: 'discard',
                  to: 'hand',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
