import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteJangoFettRenownedBountyHunter = {
  cardId: 'jango-fett--renowned-bounty-hunter',
  name: 'Jango Fett, Renowned Bounty Hunter',
  kind: 'unit',
  aspects: ['Villainy', 'Aggression'],
  traits: ['Underworld', 'Bounty Hunter'],
  cost: 4,
  unique: true,
  power: 3,
  hp: 6,
  arena: 'ground',
  constant: [
    {
      condition: {
        kind: 'attacking-unit',
        filter: {
          hasBounty: true,
        },
      },
      power: 3,
      abilities: {
        keywords: ['Overwhelm'],
      },
    },
  ],
  triggers: [
    {
      id: 'attack-defeated-unit',
      timing: 'attack-defeated-unit',
      effects: [
        {
          kind: 'draw-cards',
          amount: 1,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
