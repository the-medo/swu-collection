import { ic27Unit } from './define.ts';

export const ic27AurraSingGettingEven = ic27Unit('aurra-sing--getting-even', {
  keywords: ['Hidden'],
  actions: [
    {
      id: 'action',
      costs: [
        {
          kind: 'exhaust-self',
        },
      ],
      limit: null,
      effects: [
        {
          kind: 'damage-unit',
          amount: 4,
          arena: 'any',
          optional: false,
        },
      ],
    },
  ],
});
