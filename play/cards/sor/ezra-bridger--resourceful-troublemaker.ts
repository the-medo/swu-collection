import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteEzraBridgerResourcefulTroublemaker = {
  cardId: 'ezra-bridger--resourceful-troublemaker',
  name: 'Ezra Bridger, Resourceful Troublemaker',
  kind: 'unit',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Force', 'Rebel', 'Spectre'],
  cost: 3,
  unique: true,
  power: 3,
  hp: 4,
  arena: 'ground',
  triggers: [
    {
      id: 'attack-ended',
      timing: 'attack-ended',
      effects: [
        {
          kind: 'inspect-zone',
          zone: 'deck',
          player: 'self',
          chooser: 'owner',
          filter: {},
          min: 0,
          max: 1,
          bind: 'card',
          effects: [
            {
              kind: 'choose-mode',
              options: [
                {
                  id: 'play',
                  effects: [
                    {
                      kind: 'play-card',
                      from: 'deck',
                      filter: {},
                      optional: true,
                      target: 'card',
                    },
                  ],
                },
                {
                  id: 'discard',
                  effects: [
                    {
                      kind: 'move-card',
                      from: 'deck',
                      to: 'discard',
                      target: 'card',
                    },
                  ],
                },
                {
                  id: 'leave',
                  effects: [],
                },
              ],
            },
          ],
          top: 1,
          group: 'top',
        },
      ],
      condition: {
        kind: 'value-at-least',
        name: 'survived',
        amount: 1,
      },
    },
  ],
} as const satisfies UnitDefinition;
