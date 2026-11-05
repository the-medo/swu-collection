import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteSparkOfRebellion = {
  cardId: 'spark-of-rebellion',
  name: 'Spark of Rebellion',
  kind: 'event',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Spectre'],
  cost: 2,
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
} as const satisfies EventDefinition;
