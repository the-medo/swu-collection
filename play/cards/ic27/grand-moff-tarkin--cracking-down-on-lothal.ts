import { ic27Unit } from './define.ts';

export const ic27GrandMoffTarkinCrackingDownOnLothal = ic27Unit(
  'grand-moff-tarkin--cracking-down-on-lothal',
  {
    auras: [
      {
        id: 'sentinel-bonus',
        filter: {
          controller: 'friendly',
          hasKeyword: 'Sentinel',
        },
        power: 1,
        hp: 1,
      },
    ],
  },
);
