import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteGuavianAntagonizer = {
  cardId: 'guavian-antagonizer',
  name: 'Guavian Antagonizer',
  kind: 'unit',
  aspects: ['Villainy', 'Aggression'],
  traits: ['Underworld', 'Trooper'],
  cost: 1,
  power: 2,
  hp: 3,
  arena: 'ground',
  keywords: ['Saboteur'],
  bounties: [
    {
      id: 'bounty',
      effects: [
        {
          kind: 'draw-cards',
          amount: 1,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
