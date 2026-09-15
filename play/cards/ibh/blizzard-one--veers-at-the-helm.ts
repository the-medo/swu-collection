import type { UnitDefinition } from '../definition.ts';

// Official identity and printed text are pinned in testing/fixtures/ibh.json.
export const blizzardOneVeersAtTheHelm = {
  cardId: 'blizzard-one--veers-at-the-helm',
  name: 'Blizzard One, Veers at the Helm',
  kind: 'unit',
  aspects: ['Vigilance', 'Villainy'],
  traits: ['Imperial', 'Vehicle', 'Walker'],
  unique: true,
  cost: 7,
  power: 5,
  hp: 7,
  arena: 'ground',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'defeat-unit',
          filter: {
            nonLeader: true,
            arena: 'ground',
            remainingHpAtMost: 3,
          },
          optional: true,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
