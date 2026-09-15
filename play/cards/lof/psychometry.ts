import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-attributes.json.
export const psychometry = {
  cardId: 'psychometry',
  name: 'Psychometry',
  kind: 'event',
  aspects: ['Cunning'],
  traits: ['Force'],
  cost: 1,
  effects: [
    {
      kind: 'inspect-zone',
      zone: 'discard',
      player: 'self',
      chooser: 'self',
      filter: {
        otherThan: 'source',
      },
      min: 1,
      max: 1,
      bind: 'chosen',
      effects: [
        {
          kind: 'search-deck',
          count: 5,
          filter: 'any',
          cardFilter: {
            sharesTraitWith: 'chosen',
          },
          max: 1,
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
