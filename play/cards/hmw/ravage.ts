import { hmwEvent } from './define.ts';

export const hmwRavage = hmwEvent('ravage', [
  {
    kind: 'distribute',
    benefit: 'weakness',
    amount: 3,
    filter: {},
    bind: 'tokens',
    effects: [],
  },
]);
