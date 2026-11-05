import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteAidFromTheInnocent = {
  cardId: 'aid-from-the-innocent',
  name: 'Aid from the Innocent',
  kind: 'event',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Gambit'],
  cost: 5,
  effects: [
    {
      kind: 'search-deck',
      count: 10,
      max: 2,
      filter: 'any',
      anyAspect: ['Heroism'],
      cardFilter: {
        notKind: 'unit',
      },
      destination: 'discard',
      bind: 'selected',
      afterEach: [
        {
          kind: 'grant-discard-play',
          target: 'selected',
          player: 'self',
          discount: 2,
          free: false,
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
