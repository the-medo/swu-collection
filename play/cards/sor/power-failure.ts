import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompletePowerFailure = {
  cardId: 'power-failure',
  name: 'Power Failure',
  kind: 'event',
  aspects: ['Aggression'],
  traits: ['Tactic'],
  cost: 2,
  effects: [
    {
      kind: 'select-unit',
      filter: {},
      optional: false,
      bind: 'chosen',
      effects: [
        {
          kind: 'select-upgrades',
          filter: {
            attachedTo: 'chosen',
          },
          min: 0,
          max: 'all',
          bind: 'upgrades',
          effects: [
            {
              kind: 'move-upgrades',
              group: 'upgrades',
              to: 'discard',
            },
          ],
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
