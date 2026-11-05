import { ic27Unit } from './define.ts';

export const ic27BlackOneDrawFireTwice = ic27Unit('black-one--draw-fire--twice', {
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'draw-cards',
          amount: 1,
        },
      ],
    },
    {
      id: 'defeated',
      timing: 'defeated',
      effects: [
        {
          kind: 'draw-cards',
          amount: 1,
        },
      ],
    },
  ],
});
