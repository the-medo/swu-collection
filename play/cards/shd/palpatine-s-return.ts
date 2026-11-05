import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompletePalpatineSReturn = {
  cardId: 'palpatine-s-return',
  name: "Palpatine's Return",
  kind: 'event',
  aspects: ['Villainy', 'Command'],
  traits: ['Force', 'Plan'],
  cost: 6,
  effects: [
    {
      kind: 'play-card',
      from: 'discard',
      filter: {
        kind: 'unit',
      },
      optional: false,
      discount: {
        kind: 'conditional',
        condition: {
          kind: 'card-matches',
          target: 'candidate',
          filter: {
            trait: 'Force',
          },
        },
        then: 8,
        otherwise: 6,
      },
    },
  ],
} as const satisfies EventDefinition;
