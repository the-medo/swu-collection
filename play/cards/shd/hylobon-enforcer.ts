import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteHylobonEnforcer = {
  cardId: 'hylobon-enforcer',
  name: 'Hylobon Enforcer',
  kind: 'unit',
  aspects: ['Villainy', 'Vigilance'],
  traits: ['Underworld'],
  cost: 1,
  power: 1,
  hp: 4,
  arena: 'ground',
  keywords: ['Grit'],
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
