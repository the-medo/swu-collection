import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteDiscerningVeteran = {
  cardId: 'discerning-veteran',
  name: 'Discerning Veteran',
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Bounty Hunter'],
  cost: 5,
  power: 3,
  hp: 4,
  arena: 'ground',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'enemy',
            nonLeader: true,
            arena: 'ground',
          },
          optional: false,
          bind: 'chosen',
          effects: [
            {
              kind: 'capture-unit',
              guard: 'source',
              target: 'chosen',
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
