import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompletePowerOfTheDarkSide = {
  cardId: 'power-of-the-dark-side',
  name: 'Power of the Dark Side',
  kind: 'event',
  aspects: ['Villainy', 'Vigilance'],
  traits: ['Innate'],
  cost: 3,
  effects: [
    {
      kind: 'select-unit',
      filter: {
        controller: 'enemy',
      },
      optional: false,
      bind: 'chosen',
      effects: [
        {
          kind: 'on-unit',
          target: 'chosen',
          operation: {
            kind: 'defeat',
          },
        },
      ],
      chooser: 'enemy',
    },
  ],
} as const satisfies EventDefinition;
