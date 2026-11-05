import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteGalacticAmbition = {
  cardId: 'galactic-ambition',
  name: 'Galactic Ambition',
  kind: 'event',
  aspects: ['Villainy'],
  traits: ['Innate'],
  cost: 7,
  effects: [
    {
      kind: 'play-card',
      from: 'hand',
      filter: {
        kind: 'unit',
        withoutAspect: 'Heroism',
      },
      optional: false,
      free: true,
      bind: 'played',
      effects: [
        {
          kind: 'damage-own-base',
          amount: {
            kind: 'card-cost',
            target: 'played',
          },
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
