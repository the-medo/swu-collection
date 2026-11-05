import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteBountyGuildInitiate = {
  cardId: 'bounty-guild-initiate',
  name: 'Bounty Guild Initiate',
  kind: 'unit',
  aspects: [],
  traits: ['Bounty Hunter'],
  cost: 1,
  power: 1,
  hp: 2,
  arena: 'ground',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'units-at-least',
            filter: {
              controller: 'friendly',
              trait: 'Bounty Hunter',
              otherThan: 'source',
            },
            amount: 1,
          },
          effects: [
            {
              kind: 'select-unit',
              filter: {
                arena: 'ground',
              },
              optional: true,
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
    },
  ],
} as const satisfies UnitDefinition;
