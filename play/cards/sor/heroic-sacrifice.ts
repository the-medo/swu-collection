import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteHeroicSacrifice = {
  cardId: 'heroic-sacrifice',
  name: 'Heroic Sacrifice',
  kind: 'event',
  aspects: ['Aggression', 'Heroism'],
  traits: ['Tactic'],
  cost: 1,
  effects: [
    {
      kind: 'draw-cards',
      amount: 1,
    },
    {
      kind: 'select-unit',
      filter: {
        controller: 'friendly',
      },
      optional: false,
      bind: 'chosen',
      effects: [
        {
          kind: 'attack-bound',
          target: 'chosen',
          optional: false,
          powerBonus: 2,
          abilities: {
            triggers: [
              {
                id: 'combat-damage-dealt',
                timing: 'combat-damage-dealt',
                effects: [
                  {
                    kind: 'on-unit',
                    target: 'source',
                    operation: {
                      kind: 'defeat',
                    },
                  },
                ],
              },
            ],
          },
        },
      ],
      forAttack: {},
    },
  ],
} as const satisfies EventDefinition;
