import { hmwUnit } from './define.ts';

export const hmwLifetreeCaravan = hmwUnit('lifetree-caravan', {
  triggers: [
    {
      id: 'played',
      timing: 'played',
      condition: {
        kind: 'units-at-least',
        filter: {
          controller: 'friendly',
        },
        amount: 3,
      },
      effects: [
        {
          kind: 'resource-top',
          optional: true,
        },
      ],
    },
  ],
});
