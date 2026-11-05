import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteRestock = {
  cardId: 'restock',
  name: 'Restock',
  kind: 'event',
  aspects: [],
  traits: ['Supply'],
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
              zone: 'discard',
              player: 'self',
              chooser: 'self',
              filter: {},
              min: 0,
              max: 4,
              bind: 'card',
              effects: [
                {
                  kind: 'bottom-deck-group',
                  group: 'chosen',
                  from: 'discard',
                },
              ],
              group: 'chosen',
            },
          ],
        },
        {
          id: 'enemy',
          effects: [
            {
              kind: 'inspect-zone',
              zone: 'discard',
              player: 'enemy',
              chooser: 'self',
              filter: {},
              min: 0,
              max: 4,
              bind: 'card',
              effects: [
                {
                  kind: 'bottom-deck-group',
                  group: 'chosen',
                  from: 'discard',
                },
              ],
              group: 'chosen',
            },
          ],
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
