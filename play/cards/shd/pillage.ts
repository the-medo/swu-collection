import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompletePillage = {
  cardId: 'pillage',
  name: 'Pillage',
  kind: 'event',
  aspects: ['Aggression'],
  traits: ['Tactic'],
  cost: 4,
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
              min: 2,
              max: 2,
              bind: 'card',
              effects: [
                {
                  kind: 'move-cards',
                  group: 'selected-cards',
                  from: 'hand',
                  to: 'discard',
                  discardBy: 'owner',
                },
              ],
              group: 'selected-cards',
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
              min: 2,
              max: 2,
              bind: 'card',
              effects: [
                {
                  kind: 'move-cards',
                  group: 'selected-cards',
                  from: 'hand',
                  to: 'discard',
                  discardBy: 'owner',
                },
              ],
              group: 'selected-cards',
            },
          ],
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
