import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteOutlawCorona = {
  cardId: 'outlaw-corona',
  name: 'Outlaw Corona',
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Underworld', 'Vehicle', 'Capital Ship'],
  cost: 3,
  power: 3,
  hp: 5,
  arena: 'space',
  bounties: [
    {
      id: 'bounty',
      effects: [
        {
          kind: 'resource-top',
          optional: false,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
