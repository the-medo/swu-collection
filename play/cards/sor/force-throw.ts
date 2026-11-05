import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteForceThrow = {
  cardId: 'force-throw',
  name: 'Force Throw',
  kind: 'event',
  aspects: ['Aggression'],
  traits: ['Force'],
  cost: 1,
  effects: [
    {
      kind: 'choose-mode',
      options: [
        {
          id: 'self',
          effects: [
            {
              kind: 'inspect-zone',
              zone: 'hand',
              player: 'self',
              chooser: 'owner',
              filter: {},
              min: 1,
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
                      kind: 'if',
                      condition: {
                        kind: 'units-at-least',
                        filter: {
                          controller: 'friendly',
                          trait: 'Force',
                        },
                        amount: 1,
                      },
                      effects: [
                        {
                          kind: 'select-unit',
                          filter: {},
                          optional: true,
                          bind: 'chosen',
                          effects: [
                            {
                              kind: 'damage-target',
                              target: 'chosen',
                              amount: {
                                kind: 'card-cost',
                                target: 'card',
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
        },
        {
          id: 'enemy',
          effects: [
            {
              kind: 'inspect-zone',
              zone: 'hand',
              player: 'enemy',
              chooser: 'owner',
              filter: {},
              min: 1,
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
                      kind: 'if',
                      condition: {
                        kind: 'units-at-least',
                        filter: {
                          controller: 'friendly',
                          trait: 'Force',
                        },
                        amount: 1,
                      },
                      effects: [
                        {
                          kind: 'select-unit',
                          filter: {},
                          optional: true,
                          bind: 'chosen',
                          effects: [
                            {
                              kind: 'damage-target',
                              target: 'chosen',
                              amount: {
                                kind: 'card-cost',
                                target: 'card',
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
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
