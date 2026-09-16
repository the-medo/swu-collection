import { hmwUnit } from './define.ts';

export const hmwRishLooTraitorousMinister = hmwUnit('rish-loo--traitorous-minister', {
  keywords: ['Hidden'],
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'enemy',
            nonLeader: true,
            withUpgrade: 'weakness',
          },
          bind: 'chosen',
          optional: false,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'take-control',
                player: 'self',
                returnWhen: 'regroup',
              },
            },
          ],
        },
      ],
    },
  ],
});
