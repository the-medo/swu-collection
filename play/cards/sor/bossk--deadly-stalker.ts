import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteBosskDeadlyStalker = {
  cardId: 'bossk--deadly-stalker',
  name: 'Bossk, Deadly Stalker',
  kind: 'unit',
  aspects: ['Cunning', 'Villainy'],
  traits: ['Underworld', 'Bounty Hunter'],
  cost: 5,
  unique: true,
  power: 4,
  hp: 5,
  arena: 'ground',
  keywords: ['Ambush'],
  triggers: [
    {
      id: 'friendly-card-played',
      timing: 'friendly-card-played',
      effects: [
        {
          kind: 'select-unit',
          filter: {},
          optional: true,
          bind: 'chosen',
          effects: [
            {
              kind: 'damage-target',
              target: 'chosen',
              amount: 2,
            },
          ],
        },
      ],
      condition: {
        kind: 'card-matches',
        target: 'subject',
        filter: {
          kind: 'event',
        },
      },
    },
  ],
} as const satisfies UnitDefinition;
