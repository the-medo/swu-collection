import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-foundations.json.
export const earlySetAdmiralMottiBrazenAndScornful = {
  cardId: 'admiral-motti--brazen-and-scornful',
  name: 'Admiral Motti, Brazen and Scornful',
  kind: 'unit',
  aspects: ['Villainy'],
  traits: ['Imperial', 'Official'],
  cost: 2,
  unique: true,
  power: 1,
  hp: 1,
  arena: 'ground',
  triggers: [
    {
      id: 'defeated',
      timing: 'defeated',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            anyAspect: ['Villainy'],
          },
          bind: 'chosen',
          optional: true,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'ready',
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
