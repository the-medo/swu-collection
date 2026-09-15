import type { EventDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 search/combat fixture.
export const faithInYourFriends = {
  cardId: 'faith-in-your-friends',
  name: 'Faith in Your Friends',
  kind: 'event',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Gambit'],
  cost: 2,
  effects: [
    {
      kind: 'search-deck',
      count: 3,
      filter: 'any',
      max: 1,
      reveal: false,
    },
    {
      kind: 'disclose',
      aspects: ['Cunning', 'Cunning', 'Cunning', 'Heroism', 'Heroism'],
      effects: [
        {
          kind: 'create-unit',
          cardId: 'spy',
          count: 2,
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
