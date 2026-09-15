import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-foundations.json.
export const friskVanguardLoudmouth = {
  cardId: 'frisk--vanguard-loudmouth',
  name: 'Frisk, Vanguard Loudmouth',
  kind: 'unit',
  aspects: ['Aggression', 'Heroism'],
  traits: ['New Republic', 'Pilot'],
  unique: true,
  cost: 2,
  power: 3,
  hp: 2,
  arena: 'ground',
  piloting: [
    {
      id: 'piloting',
      cost: 2,
      aspects: ['Aggression', 'Heroism'],
    },
  ],
  upgrade: {
    attachTo: 'friendly-vehicle-without-pilot',
    modifiers: {
      power: 2,
      hp: 2,
    },
    triggers: [
      {
        id: 'remove-small-upgrade',
        timing: 'played',
        effects: [
          {
            kind: 'select-upgrades',
            filter: {
              maxCost: 2,
            },
            min: 0,
            max: 1,
            bind: 'removed',
            effects: [
              {
                kind: 'move-upgrades',
                group: 'removed',
                to: 'discard',
              },
            ],
          },
        ],
      },
    ],
  },
} as const satisfies UnitDefinition;
