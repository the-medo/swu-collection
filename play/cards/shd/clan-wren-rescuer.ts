import type { UnitDefinition } from '../definition.ts';

// Reprinted in IC27 033; identity and text follow the official catalog.
export const ic27ReprintClanWrenRescuer = {
  cardId: 'clan-wren-rescuer',
  name: 'Clan Wren Rescuer',
  kind: 'unit',
  aspects: ['Heroism', 'Vigilance'],
  traits: ['Mandalorian', 'Trooper'],
  cost: 2,
  power: 1,
  hp: 2,
  arena: 'ground',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {},
          bind: 'chosen',
          optional: false,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
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
} as const satisfies UnitDefinition;
