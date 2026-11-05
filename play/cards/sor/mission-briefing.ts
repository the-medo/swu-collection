import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteMissionBriefing = {
  cardId: 'mission-briefing',
  name: 'Mission Briefing',
  kind: 'event',
  aspects: ['Aggression'],
  traits: ['Plan'],
  cost: 3,
  effects: [
    {
      kind: 'choose-mode',
      options: [
        {
          id: 'self',
          effects: [
            {
              kind: 'draw-cards',
              amount: 2,
            },
          ],
        },
        {
          id: 'enemy',
          effects: [
            {
              kind: 'draw-cards',
              amount: 2,
              player: 'enemy',
            },
          ],
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
