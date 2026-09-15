import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-effects.json.
export const undercityHuntingTeam = {
  cardId: 'undercity-hunting-team',
  name: 'Undercity Hunting Team',
  kind: 'unit',
  aspects: ['Command', 'Villainy'],
  traits: ['Underworld', 'Bounty Hunter'],
  cost: 5,
  power: 5,
  hp: 5,
  arena: 'ground',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'search-deck',
          count: 5,
          filter: 'unit',
          trait: 'Bounty Hunter',
          max: 1,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
