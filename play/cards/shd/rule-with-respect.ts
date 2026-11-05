import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteRuleWithRespect = {
  cardId: 'rule-with-respect',
  name: 'Rule with Respect',
  kind: 'event',
  aspects: ['Command', 'Heroism'],
  traits: ['Plan'],
  cost: 4,
  effects: [
    {
      kind: 'select-unit',
      filter: {
        controller: 'friendly',
      },
      optional: false,
      bind: 'guard',
      effects: [
        {
          kind: 'select-units',
          filter: {
            controller: 'enemy',
            nonLeader: true,
            attackedBaseThisPhase: true,
          },
          bind: 'chosen',
          min: {
            kind: 'unit-count',
            filter: {
              controller: 'enemy',
              nonLeader: true,
              attackedBaseThisPhase: true,
            },
          },
          max: {
            kind: 'unit-count',
            filter: {
              controller: 'enemy',
              nonLeader: true,
              attackedBaseThisPhase: true,
            },
          },
          effects: [
            {
              kind: 'capture-group',
              guard: 'guard',
              group: 'chosen',
            },
          ],
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
