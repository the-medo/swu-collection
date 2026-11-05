import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteStrafingGunship = {
  cardId: 'strafing-gunship',
  name: 'Strafing Gunship',
  kind: 'unit',
  aspects: ['Cunning'],
  traits: ['Underworld', 'Vehicle', 'Fighter'],
  cost: 4,
  power: 3,
  hp: 4,
  arena: 'space',
  attackBothArenas: true,
  auras: [
    {
      id: 'aura',
      filter: {
        arena: 'ground',
        defendingAgainst: {
          sameAs: 'source',
        },
      },
      power: -2,
    },
  ],
} as const satisfies UnitDefinition;
