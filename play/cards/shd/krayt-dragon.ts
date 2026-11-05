import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteKraytDragon = {
  cardId: 'krayt-dragon',
  name: 'Krayt Dragon',
  kind: 'unit',
  aspects: ['Aggression'],
  traits: ['Creature'],
  cost: 9,
  power: 10,
  hp: 10,
  arena: 'ground',
  keywords: ['Overwhelm'],
  triggers: [
    {
      id: 'enemy-card-played',
      timing: 'enemy-card-played',
      effects: [
        {
          kind: 'select-target',
          units: {
            controller: 'enemy',
            arena: 'ground',
          },
          bases: 'enemy',
          optional: true,
          bind: 'chosen',
          effects: [
            {
              kind: 'damage-target',
              target: 'chosen',
              amount: {
                kind: 'card-cost',
                target: 'subject',
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
