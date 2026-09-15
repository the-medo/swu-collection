import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-interactions.json.
export const displayPiece = {
  cardId: 'display-piece',
  name: 'Display Piece',
  kind: 'event',
  aspects: ['Vigilance', 'Villainy'],
  traits: ['Supply'],
  cost: 4,
  effects: [
    {
      kind: 'select-unit',
      filter: {
        controller: 'enemy',
        nonLeader: true,
      },
      bind: 'chosen',
      optional: false,
      effects: [
        {
          kind: 'on-unit',
          target: 'chosen',
          operation: {
            kind: 'defeat',
          },
          ifYouDo: [
            {
              kind: 'resource-departed',
              target: 'chosen',
            },
          ],
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
