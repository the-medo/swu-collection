import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-effects.json.
export const forceSpeed = {
  cardId: 'force-speed',
  name: 'Force Speed',
  kind: 'event',
  aspects: ['Cunning', 'Cunning'],
  traits: ['Force'],
  cost: 1,
  effects: [
    {
      kind: 'select-unit',
      filter: {
        controller: 'friendly',
      },
      bind: 'chosen',
      optional: false,
      forAttack: {},
      effects: [
        {
          kind: 'attack-bound',
          target: 'chosen',
          optional: false,
          abilities: {
            triggers: [
              {
                id: 'return-defender-upgrades',
                timing: 'attack',
                effects: [
                  {
                    kind: 'select-upgrades',
                    filter: {
                      attachedTo: 'defender',
                      unique: false,
                    },
                    min: 0,
                    max: 'all',
                    bind: 'upgrades',
                    effects: [
                      {
                        kind: 'move-upgrades',
                        group: 'upgrades',
                        to: 'hand',
                      },
                    ],
                  },
                ],
              },
            ],
          },
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
