import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteHomeOneAllianceFlagship = {
  cardId: 'home-one--alliance-flagship',
  name: 'Home One, Alliance Flagship',
  kind: 'unit',
  aspects: ['Command', 'Heroism'],
  traits: ['Rebel', 'Vehicle', 'Capital Ship'],
  cost: 8,
  unique: true,
  power: 7,
  hp: 7,
  arena: 'space',
  restore: 2,
  auras: [
    {
      id: 'aura',
      filter: {
        controller: 'friendly',
        otherThan: 'source',
      },
      abilities: {
        restore: 1,
      },
    },
  ],
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'play-card',
          from: 'discard',
          filter: {
            kind: 'unit',
            aspect: 'Heroism',
          },
          optional: false,
          discount: 3,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
