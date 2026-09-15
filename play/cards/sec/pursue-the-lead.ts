import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-effects.json.
export const pursueTheLead = {
  cardId: 'pursue-the-lead',
  name: 'Pursue the Lead',
  kind: 'event',
  aspects: ['Aggression'],
  traits: ['Plan'],
  cost: 2,
  effects: [
    {
      kind: 'choose-mode',
      options: [
        {
          id: 'discard-self',
          effects: [
            {
              kind: 'inspect-zone',
              zone: 'hand',
              player: 'self',
              chooser: 'owner',
              filter: {},
              min: 1,
              max: 1,
              bind: 'chosen',
              effects: [
                {
                  kind: 'move-card',
                  target: 'chosen',
                  from: 'hand',
                  to: 'discard',
                  discardBy: 'owner',
                },
                {
                  kind: 'if',
                  condition: {
                    kind: 'card-matches',
                    target: 'chosen',
                    filter: {
                      maxCost: 3,
                    },
                  },
                  effects: [
                    {
                      kind: 'create-unit',
                      cardId: 'spy',
                      count: 1,
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          id: 'discard-enemy',
          effects: [
            {
              kind: 'inspect-zone',
              zone: 'hand',
              player: 'enemy',
              chooser: 'owner',
              filter: {},
              min: 1,
              max: 1,
              bind: 'chosen',
              effects: [
                {
                  kind: 'move-card',
                  target: 'chosen',
                  from: 'hand',
                  to: 'discard',
                  discardBy: 'owner',
                },
                {
                  kind: 'if',
                  condition: {
                    kind: 'card-matches',
                    target: 'chosen',
                    filter: {
                      maxCost: 3,
                    },
                  },
                  effects: [
                    {
                      kind: 'create-unit',
                      cardId: 'spy',
                      count: 1,
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
