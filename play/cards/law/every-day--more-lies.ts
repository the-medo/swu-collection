import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-effects.json.
export const everyDayMoreLies = {
  cardId: 'every-day--more-lies',
  name: 'Every Day, More Lies',
  kind: 'event',
  aspects: ['Aggression'],
  traits: ['Innate'],
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
      bind: 'chosen',
      effects: [
        {
          kind: 'move-card',
          target: 'chosen',
          from: 'hand',
          to: 'discard',
          discardBy: 'owner',
        },
      ],
    },
    {
      kind: 'inspect-zone',
      zone: 'hand',
      player: 'enemy',
      chooser: 'owner',
      filter: {},
      min: 1,
      max: 1,
      bind: 'chosen',
      effects: [
        {
          kind: 'move-card',
          target: 'chosen',
          from: 'hand',
          to: 'discard',
          discardBy: 'owner',
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
