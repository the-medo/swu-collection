import { hmwUnit } from './define.ts';

export const hmwNeebrayManta = hmwUnit('neebray-manta', {
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'draw-cards',
          amount: 3,
        },
      ],
    },
  ],
});
