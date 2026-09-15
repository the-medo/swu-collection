import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-finale.json.
export const premonitionOfDoom = {
  cardId: 'premonition-of-doom',
  name: 'Premonition of Doom',
  kind: 'event',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Force'],
  cost: 3,
  effects: [
    {
      kind: 'schedule-phase-trigger',
      id: 'exhaust-on-initiative',
      timing: 'initiative-taken',
      effects: [
        {
          kind: 'exhaust-units',
          filter: {},
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
