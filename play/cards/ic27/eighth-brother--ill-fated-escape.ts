import { ic27Unit } from './define.ts';

export const ic27EighthBrotherIllFatedEscape = ic27Unit('eighth-brother--ill-fated-escape', {
  triggers: [
    {
      id: 'defeated',
      timing: 'defeated',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            trait: 'Imperial',
          },
          bind: 'chosen',
          optional: true,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'ready',
              },
            },
          ],
        },
      ],
    },
  ],
});
