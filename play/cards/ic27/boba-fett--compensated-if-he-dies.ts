import { ic27Unit } from './define.ts';

export const ic27BobaFettCompensatedIfHeDies = ic27Unit('boba-fett--compensated-if-he-dies', {
  triggers: [
    {
      id: 'attack-ended',
      timing: 'attack-ended',
      effects: [
        {
          kind: 'select-resources',
          player: 'self',
          exhausted: 'any',
          min: 0,
          max: 2,
          operation: 'ready',
        },
      ],
      condition: {
        kind: 'value-at-least',
        name: 'defender-defeated',
        amount: 1,
      },
    },
  ],
});
