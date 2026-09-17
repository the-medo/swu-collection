import { hmwUnit } from './define.ts';

export const hmwCoronaSquadronXWing = hmwUnit('corona-squadron-x-wing', {
  triggers: [
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'select-resources',
          player: 'self',
          exhausted: true,
          min: 0,
          max: 1,
          operation: 'ready',
        },
      ],
    },
  ],
});
