import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteTakeCaptive = {
  cardId: 'take-captive',
  name: 'Take Captive',
  kind: 'event',
  aspects: ['Command'],
  traits: ['Tactic'],
  cost: 3,
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
          kind: 'select-unit',
          filter: {
            controller: 'enemy',
            nonLeader: true,
            sameArenaAs: 'guard',
          },
          optional: false,
          bind: 'chosen',
          effects: [
            {
              kind: 'capture-unit',
              guard: 'guard',
              target: 'chosen',
            },
          ],
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
