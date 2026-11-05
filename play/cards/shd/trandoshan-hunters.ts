import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteTrandoshanHunters = {
  cardId: 'trandoshan-hunters',
  name: 'Trandoshan Hunters',
  kind: 'unit',
  aspects: ['Villainy', 'Aggression'],
  traits: ['Underworld', 'Bounty Hunter'],
  cost: 5,
  power: 6,
  hp: 4,
  arena: 'ground',
  keywords: ['Overwhelm'],
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'units-at-least',
            filter: {
              controller: 'enemy',
              hasBounty: true,
            },
            amount: 1,
          },
          effects: [
            {
              kind: 'on-unit',
              target: 'source',
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
} as const satisfies UnitDefinition;
