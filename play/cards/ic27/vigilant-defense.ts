import { ic27Event } from './define.ts';

export const ic27VigilantDefense = ic27Event('vigilant-defense', [
  {
    kind: 'select-unit',
    filter: {
      controller: 'friendly',
    },
    bind: 'chosen',
    optional: false,
    effects: [
      {
        kind: 'on-unit',
        target: 'chosen',
        operation: {
          kind: 'modify',
          power: 0,
          hp: 3,
          duration: 'phase',
          abilities: {
            keywords: ['Sentinel'],
          },
        },
      },
    ],
  },
  {
    kind: 'select-target',
    units: {
      controller: 'friendly',
    },
    bases: 'friendly',
    bind: 'chosen',
    optional: false,
    effects: [
      {
        kind: 'heal-target',
        target: 'chosen',
        amount: 3,
      },
    ],
  },
  {
    kind: 'defeat-unit',
    filter: {
      controller: 'enemy',
      remainingHpAtMost: 3,
    },
    optional: false,
  },
]);
