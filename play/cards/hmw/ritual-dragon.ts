import { hmwUnit } from './define.ts';

export const hmwRitualDragon = hmwUnit('ritual-dragon', {
  keywords: ['Saboteur'],
  entersReady: {
    kind: 'controls-base-trait',
    trait: 'Tatooine',
  },
  constant: [
    {
      condition: {
        kind: 'controls-base-trait',
        trait: 'Tatooine',
      },
      abilities: {
        friendlyUnitsEnterReady: true,
      },
    },
  ],
});
