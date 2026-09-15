import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-foundations.json.
export const tamRyvoraSearchingForPurpose = {
  cardId: 'tam-ryvora--searching-for-purpose',
  name: 'Tam Ryvora, Searching For Purpose',
  kind: 'unit',
  aspects: ['Vigilance', 'Villainy'],
  traits: ['First Order', 'Pilot'],
  unique: true,
  cost: 3,
  power: 2,
  hp: 5,
  arena: 'ground',
  piloting: [
    {
      id: 'piloting',
      cost: 2,
      aspects: ['Vigilance', 'Villainy'],
    },
  ],
  upgrade: {
    attachTo: 'friendly-vehicle-without-pilot',
    modifiers: {
      power: 2,
      hp: 2,
    },
    grants: {
      triggers: [
        {
          id: 'weaken-enemy',
          timing: 'attack',
          effects: [
            {
              kind: 'select-unit',
              filter: {
                controller: 'enemy',
                sameArenaAs: 'source',
              },
              bind: 'chosen',
              optional: false,
              effects: [
                {
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'modify',
                    power: -1,
                    hp: -1,
                    duration: 'phase',
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  },
} as const satisfies UnitDefinition;
