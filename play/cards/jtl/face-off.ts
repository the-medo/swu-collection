import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-effects.json.
export const faceOff = {
  cardId: 'face-off',
  name: 'Face Off',
  kind: 'event',
  aspects: ['Aggression'],
  traits: ['Tactic'],
  cost: 3,
  effects: [
    {
      kind: 'if',
      condition: {
        kind: 'initiative-unclaimed',
      },
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'enemy',
          },
          bind: 'enemy',
          optional: true,
          effects: [
            {
              kind: 'on-unit',
              target: 'enemy',
              operation: {
                kind: 'ready',
              },
              ifYouDo: [
                {
                  kind: 'select-unit',
                  filter: {
                    controller: 'friendly',
                    sameArenaAs: 'enemy',
                  },
                  bind: 'chosen',
                  optional: false,
                  effects: [
                    {
                      kind: 'on-unit',
                      target: 'chosen',
                      operation: {
                        kind: 'ready',
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
} as const satisfies EventDefinition;
