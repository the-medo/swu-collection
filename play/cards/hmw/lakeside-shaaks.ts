import { hmwUnit } from './define.ts';

export const hmwLakesideShaaks = hmwUnit('lakeside-shaaks', {
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'select-resources',
          player: 'self',
          exhausted: true,
          min: 1,
          max: 1,
          operation: 'ready',
        },
      ],
    },
  ],
});
