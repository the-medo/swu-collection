import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteMedalCeremony = {
  cardId: 'medal-ceremony',
  name: 'Medal Ceremony',
  kind: 'event',
  aspects: ['Heroism'],
  traits: ['Rebel'],
  cost: 0,
  effects: [
    {
      kind: 'select-units',
      filter: {
        trait: 'Rebel',
        attackedThisPhase: true,
      },
      bind: 'chosen',
      min: 0,
      max: 3,
      effects: [
        {
          kind: 'each-unit',
          filter: {
            inGroup: 'chosen',
          },
          bind: 'recipient',
          effects: [
            {
              kind: 'on-unit',
              target: 'recipient',
              operation: {
                kind: 'give-token',
                token: 'experience',
                count: 1,
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
