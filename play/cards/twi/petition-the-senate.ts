import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompletePetitionTheSenate = {
  cardId: 'petition-the-senate',
  name: 'Petition the Senate',
  kind: 'event',
  aspects: ['Command', 'Heroism'],
  traits: ['Tactic'],
  cost: 3,
  effects: [
    {
      kind: 'if',
      condition: {
        kind: 'units-at-least',
        filter: {
          controller: 'friendly',
          trait: 'Official',
        },
        amount: 3,
      },
      effects: [
        {
          kind: 'draw-cards',
          amount: 3,
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
