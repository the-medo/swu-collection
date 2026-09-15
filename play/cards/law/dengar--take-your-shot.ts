import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-history.json.
export const dengarTakeYourShot = {
  cardId: 'dengar--take-your-shot',
  name: 'Dengar, Take Your Shot',
  kind: 'unit',
  aspects: ['Command', 'Aggression', 'Villainy'],
  traits: ['Underworld', 'Bounty Hunter'],
  unique: true,
  cost: 3,
  power: 4,
  hp: 3,
  arena: 'ground',
  triggers: [
    {
      id: 'enemy-defeated',
      timing: 'enemy-defeated',
      effects: [
        {
          kind: 'create-credits',
          amount: 1,
        },
      ],
      condition: {
        kind: 'unit-matches',
        target: 'subject',
        filter: {
          controller: 'enemy',
          mostCostAmong: {
            controller: 'enemy',
          },
        },
      },
      limit: 'once-per-round',
    },
  ],
} as const satisfies UnitDefinition;
