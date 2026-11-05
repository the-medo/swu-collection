import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteAgentKallusSeekingTheRebels = {
  cardId: 'agent-kallus--seeking-the-rebels',
  name: 'Agent Kallus, Seeking the Rebels',
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Imperial', 'Trooper'],
  cost: 5,
  unique: true,
  power: 4,
  hp: 4,
  arena: 'ground',
  keywords: ['Ambush'],
  triggers: [
    {
      id: 'unit-defeated',
      timing: 'unit-defeated',
      effects: [
        {
          kind: 'draw-cards',
          amount: 1,
        },
      ],
      condition: {
        kind: 'unit-matches',
        target: 'subject',
        filter: {
          unique: true,
        },
      },
      excludeSelf: true,
      optional: true,
      limit: 'once-per-round',
    },
  ],
} as const satisfies UnitDefinition;
