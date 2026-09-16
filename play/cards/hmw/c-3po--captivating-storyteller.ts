import { hmwUnit } from './define.ts';

export const hmwC3poCaptivatingStoryteller = hmwUnit('c-3po--captivating-storyteller', {
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            trait: 'Ewok',
          },
          bind: 'ewok',
          optional: true,
          effects: [
            {
              kind: 'on-unit',
              target: 'ewok',
              operation: {
                kind: 'modify',
                power: 2,
                hp: 2,
                duration: 'phase',
              },
            },
          ],
        },
        {
          kind: 'select-unit',
          filter: {
            trait: 'Rebel',
          },
          bind: 'rebel',
          optional: true,
          effects: [
            {
              kind: 'on-unit',
              target: 'rebel',
              operation: {
                kind: 'modify',
                power: 2,
                hp: 2,
                duration: 'phase',
              },
            },
          ],
        },
      ],
    },
  ],
});
