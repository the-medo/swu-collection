import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-effects.json.
export const commencePatrol = {
  cardId: 'commence-patrol',
  name: 'Commence Patrol',
  kind: 'event',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Tactic'],
  cost: 1,
  effects: [
    {
      kind: 'choose-mode',
      options: [
        {
          id: 'self-discard',
          effects: [
            {
              kind: 'inspect-zone',
              zone: 'discard',
              player: 'self',
              chooser: 'self',
              filter: {
                otherThan: 'source',
              },
              min: 1,
              max: 1,
              bind: 'chosen',
              effects: [
                {
                  kind: 'move-card',
                  target: 'chosen',
                  from: 'discard',
                  to: 'deck-bottom',
                  effects: [
                    {
                      kind: 'create-unit',
                      cardId: 'x-wing',
                      count: 1,
                    },
                  ],
                },
              ],
            },
          ],
          condition: {
            kind: 'numeric-at-least',
            value: {
              kind: 'zone-size',
              zone: 'discard',
              player: 'self',
              filter: {
                otherThan: 'source',
              },
            },
            amount: 1,
          },
        },
        {
          id: 'enemy-discard',
          effects: [
            {
              kind: 'inspect-zone',
              zone: 'discard',
              player: 'enemy',
              chooser: 'self',
              filter: {
                otherThan: 'source',
              },
              min: 1,
              max: 1,
              bind: 'chosen',
              effects: [
                {
                  kind: 'move-card',
                  target: 'chosen',
                  from: 'discard',
                  to: 'deck-bottom',
                  effects: [
                    {
                      kind: 'create-unit',
                      cardId: 'x-wing',
                      count: 1,
                    },
                  ],
                },
              ],
            },
          ],
          condition: {
            kind: 'numeric-at-least',
            value: {
              kind: 'zone-size',
              zone: 'discard',
              player: 'enemy',
              filter: {
                otherThan: 'source',
              },
            },
            amount: 1,
          },
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
