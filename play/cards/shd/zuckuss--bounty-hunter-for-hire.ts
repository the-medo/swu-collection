import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteZuckussBountyHunterForHire = {
  cardId: 'zuckuss--bounty-hunter-for-hire',
  name: 'Zuckuss, Bounty Hunter for Hire',
  kind: 'unit',
  aspects: ['Villainy', 'Cunning'],
  traits: ['Underworld', 'Bounty Hunter'],
  cost: 5,
  unique: true,
  power: 6,
  hp: 6,
  arena: 'ground',
  keywords: ['Saboteur'],
  auras: [
    {
      id: 'aura',
      filter: {
        controller: 'friendly',
        name: '4-LOM',
      },
      power: 1,
      hp: 1,
      abilities: {
        keywords: ['Saboteur'],
      },
    },
  ],
} as const satisfies UnitDefinition;
