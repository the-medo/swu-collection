import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteUnnaturalLife = {
  cardId: 'unnatural-life',
  name: 'Unnatural Life',
  kind: 'event',
  aspects: ['Cunning', 'Villainy'],
  traits: ['Force'],
  cost: 3,
  effects: [
    {
      kind: 'play-card',
      from: 'discard',
      filter: {
        kind: 'unit',
        defeatedThisPhase: true,
      },
      optional: false,
      discount: 2,
      ready: true,
      bind: 'played',
      effects: [
        {
          kind: 'schedule-regroup-operation',
          target: 'played',
          operation: 'defeat',
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
