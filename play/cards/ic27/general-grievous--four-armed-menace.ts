import { ic27Unit } from './define.ts';

export const ic27GeneralGrievousFourArmedMenace = ic27Unit('general-grievous--four-armed-menace', {
  triggers: [
    {
      id: 'upgrade-played-on-self',
      timing: 'upgrade-played-on-self',
      effects: [
        {
          kind: 'choose-mode',
          oncePerPhase: 'upgrade-benefit',
          options: [
            {
              id: 'experience',
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
            {
              id: 'heal',
              effects: [
                {
                  kind: 'heal-own-base',
                  amount: 3,
                },
              ],
            },
            {
              id: 'draw',
              effects: [
                {
                  kind: 'draw-cards',
                  amount: 1,
                },
              ],
            },
          ],
        },
      ],
    },
  ],
});
