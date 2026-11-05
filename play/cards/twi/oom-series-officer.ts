import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteOomSeriesOfficer = {
  cardId: 'oom-series-officer',
  name: 'OOM-Series Officer',
  kind: 'unit',
  aspects: ['Aggression', 'Villainy'],
  traits: ['Separatist', 'Droid'],
  cost: 2,
  power: 2,
  hp: 1,
  arena: 'ground',
  triggers: [
    {
      id: 'defeated',
      timing: 'defeated',
      effects: [
        {
          kind: 'select-target',
          bases: 'any',
          bind: 'chosen',
          optional: false,
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
