import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteCloneDeserter = {
  cardId: 'clone-deserter',
  name: 'Clone Deserter',
  kind: 'unit',
  aspects: ['Command', 'Heroism'],
  traits: ['Fringe', 'Clone'],
  cost: 1,
  power: 2,
  hp: 3,
  arena: 'ground',
  restore: 1,
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
