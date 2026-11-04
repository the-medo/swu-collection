import { ic27Unit } from './define.ts';

export const ic27BansheeScreamMachine = ic27Unit('banshee--scream-machine', {
  triggers: [
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'search-deck',
          count: 5,
          filter: 'any',
          cardFilter: {
            notKind: 'unit',
          },
          destination: 'deck-top',
          max: 1,
        },
      ],
      optional: true,
    },
  ],
});
