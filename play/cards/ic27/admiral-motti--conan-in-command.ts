import { ic27Unit } from './define.ts';

export const ic27AdmiralMottiConanInCommand = ic27Unit('admiral-motti--conan-in-command', {
  keywords: ['Hidden'],
  triggers: [
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'each-unit',
          filter: {
            controller: 'friendly',
            trait: 'Imperial',
            otherThan: 'source',
          },
          bind: 'unit',
          effects: [
            {
              kind: 'on-unit',
              target: 'unit',
              operation: {
                kind: 'give-token',
                token: 'experience',
                count: 1,
              },
            },
          ],
        },
      ],
    },
  ],
});
