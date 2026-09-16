import { hmwUnit } from './define.ts';

export const hmwTirelessMagnaguard = hmwUnit('tireless-magnaguard', {
  triggers: [
    {
      id: 'defeated',
      timing: 'defeated',
      condition: {
        kind: 'numeric-at-least',
        value: { kind: 'unit-stat', target: 'source', stat: 'power' },
        amount: 5,
      },
      effects: [
        {
          kind: 'grant-discard-play',
          target: 'source',
          player: 'self',
          free: true,
          phaseAbilities: {
            triggers: [
              {
                id: 'weakness-played',
                timing: 'played',
                effects: [
                  { kind: 'give-self-token', token: 'weakness' },
                  { kind: 'give-self-token', token: 'weakness' },
                ],
              },
            ],
          },
        },
      ],
    },
  ],
});
