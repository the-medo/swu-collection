import type { EventDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 conditional ability fixture.
export const tipTheScale = {
  cardId: 'tip-the-scale',
  name: 'Tip the Scale',
  kind: 'event',
  aspects: ['Cunning'],
  traits: ['Force', 'Trick'],
  cost: 2,
  effects: [
    {
      kind: 'inspect-zone',
      zone: 'hand',
      player: 'enemy',
      chooser: 'self',
      filter: {
        notKind: 'unit',
      },
      min: 1,
      max: 1,
      bind: 'discard',
      effects: [
        {
          kind: 'move-card',
          target: 'discard',
          from: 'hand',
          to: 'discard',
          effects: [],
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
