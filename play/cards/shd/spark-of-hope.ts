import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteSparkOfHope = {
  cardId: 'spark-of-hope',
  name: 'Spark of Hope',
  kind: 'event',
  aspects: ['Command', 'Heroism'],
  traits: ['Innate'],
  cost: 2,
  effects: [
    {
      kind: 'inspect-zone',
      zone: 'discard',
      player: 'self',
      chooser: 'owner',
      filter: {
        kind: 'unit',
        defeatedThisPhase: true,
      },
      min: 1,
      max: 1,
      bind: 'card',
      effects: [
        {
          kind: 'resource-departed',
          target: 'card',
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
