import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteR2D2FullOfSolutions = {
  cardId: 'r2-d2--full-of-solutions',
  name: 'R2-D2, Full of Solutions',
  kind: 'unit',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Republic', 'Droid'],
  cost: 2,
  unique: true,
  power: 2,
  hp: 4,
  arena: 'ground',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'inspect-zone',
          zone: 'hand',
          player: 'self',
          chooser: 'owner',
          filter: {},
          min: 0,
          max: 1,
          bind: 'card',
          effects: [
            {
              kind: 'move-card',
              target: 'card',
              from: 'hand',
              to: 'discard',
              effects: [
                {
                  kind: 'search-deck',
                  count: 3,
                  max: 1,
                  filter: 'any',
                  reveal: false,
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
