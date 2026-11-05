import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteHelloThere = {
  cardId: 'hello-there',
  name: 'Hello There',
  kind: 'event',
  aspects: ['Vigilance', 'Heroism'],
  traits: ['Trick'],
  cost: 3,
  effects: [
    {
      kind: 'select-unit',
      filter: {
        enteredThisPhase: true,
      },
      optional: false,
      bind: 'chosen',
      effects: [
        {
          kind: 'on-unit',
          target: 'chosen',
          operation: {
            kind: 'modify',
            power: -4,
            hp: -4,
            duration: 'phase',
          },
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
