import type { UnitDefinition } from '../definition.ts';

// ASH 063. Printed text is pinned in meta-continuous fixture.
export const boKatanSGauntletReinforceFromAbove = {
  cardId: 'bo-katan-s-gauntlet--reinforce-from-above',
  name: "Bo-Katan's Gauntlet, Reinforce from Above",
  kind: 'unit',
  aspects: ['Vigilance', 'Heroism'],
  traits: ['Mandalorian', 'Vehicle', 'Transport'],
  cost: 5,
  unique: true,
  power: 4,
  hp: 5,
  arena: 'space',
  restore: 1,
  auras: [
    {
      id: 'mandalorian-reinforcements',
      filter: {
        controller: 'friendly',
        token: false,
        otherThan: 'source',
      },
      abilities: {
        triggers: [
          {
            id: 'on-defeated',
            timing: 'defeated',
            effects: [
              {
                kind: 'create-unit',
                cardId: 'mandalorian',
                count: 1,
              },
            ],
          },
        ],
      },
    },
  ],
} as const satisfies UnitDefinition;
