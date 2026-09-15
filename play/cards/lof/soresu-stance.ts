import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-effects.json.
export const soresuStance = {
  cardId: 'soresu-stance',
  name: 'Soresu Stance',
  kind: 'event',
  aspects: ['Vigilance'],
  traits: ['Learned'],
  cost: 1,
  effects: [
    {
      kind: 'play-card',
      from: 'hand',
      filter: {
        kind: 'unit',
        trait: 'Force',
      },
      optional: false,
      bind: 'played',
      effects: [
        {
          kind: 'on-unit',
          target: 'played',
          operation: {
            kind: 'give-token',
            token: 'shield',
            count: 1,
          },
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
