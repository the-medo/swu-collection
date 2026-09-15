import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-phase.json.
export const galvanizedLeap = {
  cardId: 'galvanized-leap',
  name: 'Galvanized Leap',
  kind: 'event',
  aspects: ['Aggression'],
  traits: ['Force'],
  cost: 4,
  effects: [
    {
      kind: 'select-unit',
      filter: {
        damagedThisPhase: true,
      },
      bind: 'chosen',
      optional: false,
      effects: [
        {
          kind: 'on-unit',
          target: 'chosen',
          operation: {
            kind: 'ready',
          },
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
