import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteGideonHaskRuthlessLoyalist = {
  cardId: 'gideon-hask--ruthless-loyalist',
  name: 'Gideon Hask, Ruthless Loyalist',
  kind: 'unit',
  aspects: ['Villainy', 'Vigilance'],
  traits: ['Imperial', 'Trooper'],
  cost: 5,
  unique: true,
  power: 5,
  hp: 5,
  arena: 'ground',
  triggers: [
    {
      id: 'enemy-defeated',
      timing: 'enemy-defeated',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'friendly',
          },
          optional: false,
          bind: 'chosen',
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
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
