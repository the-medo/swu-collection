import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyComplete4LomBountyHunterForHire = {
  cardId: '4-lom--bounty-hunter-for-hire',
  name: '4-LOM, Bounty Hunter for Hire',
  kind: 'unit',
  aspects: ['Villainy', 'Cunning'],
  traits: ['Underworld', 'Droid', 'Bounty Hunter'],
  cost: 4,
  unique: true,
  power: 4,
  hp: 4,
  arena: 'ground',
  keywords: ['Ambush'],
  auras: [
    {
      id: 'aura',
      filter: {
        controller: 'friendly',
        name: 'Zuckuss',
      },
      power: 1,
      hp: 1,
      abilities: {
        keywords: ['Ambush'],
      },
    },
  ],
} as const satisfies UnitDefinition;
