import { hmwUpgrade } from './define.ts';

export const hmwTwilekKalikori = hmwUpgrade('twi-lek-kalikori', {
  triggers: [
    {
      id: 'played',
      timing: 'played',
      condition: { kind: 'attached-to-friendly-trait', trait: "Twi'lek" },
      effects: [
        {
          kind: 'search-deck',
          count: 8,
          filter: 'unit',
          trait: "Twi'lek",
          max: 120,
          maxTotalCost: 5,
          play: { discount: 0, free: true },
        },
      ],
    },
  ],
});
