import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteHunterOfTheHaxionBrood = {
  cardId: 'hunter-of-the-haxion-brood',
  name: 'Hunter of the Haxion Brood',
  kind: 'unit',
  aspects: ['Villainy', 'Cunning'],
  traits: ['Underworld', 'Bounty Hunter'],
  cost: 3,
  power: 4,
  hp: 3,
  arena: 'ground',
  constant: [
    {
      condition: {
        kind: 'units-at-least',
        filter: {
          controller: 'enemy',
          hasBounty: true,
        },
        amount: 1,
      },
      abilities: {
        keywords: ['Shielded'],
      },
    },
  ],
} as const satisfies UnitDefinition;
