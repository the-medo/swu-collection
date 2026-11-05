import { ic27Unit } from './define.ts';

export const ic27MaceWinduDroppingBy = ic27Unit('mace-windu--dropping-by', {
  keywords: ['Ambush'],
  triggers: [
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'on-unit',
          target: 'source',
          operation: {
            kind: 'give-token',
            token: 'experience',
            count: 1,
          },
        },
      ],
    },
  ],
});
