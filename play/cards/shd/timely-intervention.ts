import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteTimelyIntervention = {
  cardId: 'timely-intervention',
  name: 'Timely Intervention',
  kind: 'event',
  aspects: ['Command'],
  traits: ['Tactic'],
  cost: 1,
  effects: [
    {
      kind: 'play-card',
      from: 'hand',
      filter: {
        kind: 'unit',
      },
      optional: false,
      phaseAbilities: {
        keywords: ['Ambush'],
      },
    },
  ],
  smuggle: [
    {
      id: 'smuggle',
      cost: 2,
      aspects: ['Command'],
    },
  ],
} as const satisfies EventDefinition;
