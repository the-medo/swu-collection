import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-foundations.json.
export const cr90ReliefRunner = {
  cardId: 'cr90-relief-runner',
  name: 'CR90 Relief Runner',
  kind: 'unit',
  aspects: ['Vigilance'],
  traits: ['Rebel', 'Vehicle', 'Capital Ship'],
  cost: 6,
  power: 4,
  hp: 6,
  arena: 'space',
  restore: 2,
  triggers: [
    {
      id: 'relief',
      timing: 'defeated',
      effects: [
        {
          kind: 'select-target',
          units: {},
          bases: 'any',
          bind: 'chosen',
          optional: true,
          effects: [
            {
              kind: 'heal-target',
              target: 'chosen',
              amount: 3,
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
