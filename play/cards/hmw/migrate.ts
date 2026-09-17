import { hmwEvent } from './define.ts';

export const hmwMigrate = hmwEvent('migrate', [
  {
    kind: 'create-unit',
    cardId: 'beast',
    count: {
      kind: 'floor-divide',
      value: {
        kind: 'zone-size',
        zone: 'resources',
        player: 'self',
      },
      divisor: 3,
    },
  },
]);
