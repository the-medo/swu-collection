import type { EventDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 search/combat fixture.
export const dismantleTheConspiracy = {
  cardId: 'dismantle-the-conspiracy',
  name: 'Dismantle the Conspiracy',
  kind: 'event',
  aspects: ['Command', 'Heroism'],
  traits: ['Tactic'],
  cost: 6,
  effects: [
    {
      kind: 'select-unit',
      filter: {
        controller: 'friendly',
      },
      optional: false,
      bind: 'chosen',
      effects: [
        {
          kind: 'select-units',
          filter: {
            controller: 'enemy',
            nonLeader: true,
          },
          remainingHpBudget: 7,
          bind: 'captives',
          effects: [
            {
              kind: 'capture-group',
              guard: 'chosen',
              group: 'captives',
            },
          ],
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
