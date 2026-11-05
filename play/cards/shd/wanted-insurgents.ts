import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteWantedInsurgents = {
  cardId: 'wanted-insurgents',
  name: 'Wanted Insurgents',
  kind: 'unit',
  aspects: ['Aggression'],
  traits: ['Rebel'],
  cost: 3,
  power: 4,
  hp: 4,
  arena: 'ground',
  bounties: [
    {
      id: 'bounty',
      effects: [
        {
          kind: 'select-unit',
          filter: {},
          optional: false,
          bind: 'chosen',
          effects: [
            {
              kind: 'damage-target',
              target: 'chosen',
              amount: 2,
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
