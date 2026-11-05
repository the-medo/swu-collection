import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteBountyHunterCrew = {
  cardId: 'bounty-hunter-crew',
  name: 'Bounty Hunter Crew',
  kind: 'unit',
  aspects: ['Villainy', 'Cunning'],
  traits: ['Underworld', 'Bounty Hunter'],
  cost: 6,
  power: 4,
  hp: 4,
  arena: 'ground',
  keywords: ['Ambush'],
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'choose-mode',
          options: [
            {
              id: 'self',
              effects: [
                {
                  kind: 'inspect-zone',
                  zone: 'discard',
                  player: 'self',
                  chooser: 'self',
                  filter: {
                    kind: 'event',
                  },
                  min: 0,
                  max: 1,
                  bind: 'card',
                  effects: [
                    {
                      kind: 'move-cards',
                      group: 'returned',
                      from: 'discard',
                      to: 'hand',
                    },
                  ],
                  group: 'returned',
                },
              ],
            },
            {
              id: 'enemy',
              effects: [
                {
                  kind: 'inspect-zone',
                  zone: 'discard',
                  player: 'enemy',
                  chooser: 'self',
                  filter: {
                    kind: 'event',
                  },
                  min: 0,
                  max: 1,
                  bind: 'card',
                  effects: [
                    {
                      kind: 'move-cards',
                      group: 'returned',
                      from: 'discard',
                      to: 'hand',
                    },
                  ],
                  group: 'returned',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
