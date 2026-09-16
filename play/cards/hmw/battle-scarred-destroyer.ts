import { hmwUnit } from './define.ts';

export const hmwBattleScarredDestroyer = hmwUnit('battle-scarred-destroyer', {
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'damage-unit',
          amount: 4,
          arena: 'any',
          optional: false,
          filter: {
            controller: 'friendly',
          },
        },
      ],
    },
  ],
});
