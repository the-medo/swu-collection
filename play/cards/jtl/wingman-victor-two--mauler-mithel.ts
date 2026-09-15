import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-foundations.json.
export const wingmanVictorTwoMaulerMithel = {
  cardId: 'wingman-victor-two--mauler-mithel',
  name: 'Wingman Victor Two, Mauler Mithel',
  kind: 'unit',
  aspects: ['Command', 'Villainy'],
  traits: ['Imperial', 'Pilot'],
  unique: true,
  cost: 2,
  power: 3,
  hp: 2,
  arena: 'ground',
  piloting: [
    {
      id: 'piloting',
      cost: 1,
      aspects: ['Command', 'Villainy'],
    },
  ],
  upgrade: {
    attachTo: 'friendly-vehicle-without-pilot',
    modifiers: {
      power: 1,
      hp: 1,
    },
    triggers: [
      {
        id: 'launch',
        timing: 'played',
        effects: [
          {
            kind: 'create-unit',
            cardId: 'tie-fighter',
            count: 1,
          },
        ],
      },
    ],
  },
} as const satisfies UnitDefinition;
