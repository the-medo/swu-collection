import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteEchoRestored = {
  cardId: 'echo--restored',
  name: 'Echo, Restored',
  kind: 'unit',
  aspects: ['Command', 'Heroism'],
  traits: ['Fringe', 'Clone'],
  cost: 4,
  unique: true,
  power: 4,
  hp: 4,
  arena: 'ground',
  restore: 2,
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
                  kind: 'select-unit',
                  filter: {
                    sameNameAs: 'card',
                  },
                  optional: false,
                  bind: 'chosen',
                  effects: [
                    {
                      kind: 'on-unit',
                      target: 'chosen',
                      operation: {
                        kind: 'give-token',
                        token: 'experience',
                        count: 2,
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
