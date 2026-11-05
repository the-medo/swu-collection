import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteEvidenceOfTheCrime = {
  cardId: 'evidence-of-the-crime',
  name: 'Evidence of the Crime',
  kind: 'event',
  aspects: ['Vigilance'],
  traits: ['Trick'],
  cost: 3,
  effects: [
    {
      kind: 'select-upgrades',
      filter: {
        maxCost: 3,
      },
      min: 1,
      max: 1,
      bind: 'upgrade',
      effects: [
        {
          kind: 'take-control-upgrade',
          target: 'upgrade',
        },
        {
          kind: 'reattach-upgrade',
          target: 'upgrade',
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
