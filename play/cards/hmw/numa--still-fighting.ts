import { hmwUnit } from './define.ts';

export const hmwNumaStillFighting = hmwUnit('numa--still-fighting', {
  restore: 1,
  damageReplacements: [
    {
      id: 'prevent-one',
      target: 'self',
      operation: 'prevent',
      amount: 1,
    },
  ],
});
