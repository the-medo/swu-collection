import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 token/effect fixture.
export const paigeTicoDroppingTheHammer = {
  cardId: 'paige-tico--dropping-the-hammer',
  name: 'Paige Tico, Dropping the Hammer',
  kind: 'unit',
  aspects: ['Vigilance', 'Heroism'],
  traits: ['Resistance', 'Pilot'],
  unique: true,
  cost: 2,
  power: 3,
  hp: 2,
  arena: 'ground',
  piloting: [
    {
      id: 'piloting',
      cost: 2,
      aspects: ['Vigilance', 'Heroism'],
    },
  ],
  upgrade: {
    modifiers: {
      power: 2,
      hp: 2,
    },
    attachTo: 'friendly-vehicle-without-pilot',
    grants: {
      triggers: [
        {
          id: 'experience-damage',
          timing: 'attack',
          effects: [
            {
              kind: 'on-unit',
              target: 'source',
              operation: {
                kind: 'give-token',
                token: 'experience',
                count: 1,
              },
            },
            {
              kind: 'on-unit',
              target: 'source',
              operation: {
                kind: 'damage',
                amount: 1,
              },
            },
          ],
        },
      ],
    },
  },
} as const satisfies UnitDefinition;
