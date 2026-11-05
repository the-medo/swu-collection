import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-foundations.json.
export const earlySetDistantPatroller = {
  cardId: 'distant-patroller',
  name: 'Distant Patroller',
  kind: 'unit',
  aspects: ['Vigilance'],
  traits: ['Fringe', 'Vehicle', 'Fighter'],
  cost: 2,
  power: 2,
  hp: 1,
  arena: 'space',
  triggers: [
    {
      id: 'defeated',
      timing: 'defeated',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            anyAspect: ['Vigilance'],
          },
          bind: 'chosen',
          optional: true,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'give-token',
                token: 'shield',
                count: 1,
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
