import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteUnmaskingTheConspiracy = {
  cardId: 'unmasking-the-conspiracy',
  name: 'Unmasking the Conspiracy',
  kind: 'event',
  aspects: ['Cunning'],
  traits: ['Gambit'],
  cost: 1,
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
              kind: 'inspect-zone',
              zone: 'hand',
              player: 'enemy',
              chooser: 'self',
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
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
