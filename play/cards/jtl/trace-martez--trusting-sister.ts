import type { UnitDefinition } from '../definition.ts';
export const traceMartezTrustingSister = {
  cardId: 'trace-martez--trusting-sister',
  name: 'Trace Martez, Trusting Sister',
  kind: 'unit',
  unique: true,
  cost: 3,
  power: 2,
  hp: 5,
  arena: 'ground',
  aspects: ['Vigilance'],
  traits: ['Fringe', 'Pilot'],
  piloting: [{ id: 'piloting', cost: 1, aspects: ['Vigilance'] }],
  upgrade: {
    attachTo: 'friendly-vehicle-without-pilot',
    modifiers: { power: 1, hp: 2 },
    grants: {
      triggers: [
        {
          id: 'attack-healing',
          timing: 'attack',
          effects: [
            {
              kind: 'distribute',
              benefit: 'heal',
              amount: 2,
              filter: {},
              bind: 'healed',
              effects: [],
            },
          ],
        },
      ],
    },
  },
} as const satisfies UnitDefinition;
