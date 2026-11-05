import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteTheInvasionOfChristophsis = {
  cardId: 'the-invasion-of-christophsis',
  name: 'The Invasion of Christophsis',
  kind: 'event',
  aspects: ['Vigilance'],
  traits: ['Separatist', 'Plan'],
  cost: 15,
  effects: [
    {
      kind: 'defeat-units',
      filter: {
        controller: 'enemy',
      },
    },
  ],
  exploit: 4,
} as const satisfies EventDefinition;
