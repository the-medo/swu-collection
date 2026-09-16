import { hmwUpgrade } from './define.ts';

export const hmwChewbaccaSBowcasterHandcraftedTradition = hmwUpgrade(
  'chewbacca-s-bowcaster--handcrafted-tradition',
  {
    attachTo: 'non-vehicle',
    triggers: [
      {
        id: 'played',
        timing: 'played',
        condition: {
          kind: 'unit-matches',
          target: 'attached',
          filter: {
            name: 'Chewbacca',
          },
        },
        effects: [
          {
            kind: 'resource-top',
            optional: false,
          },
        ],
      },
    ],
  },
);
