import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteMagnaguardWingLeader = {
  cardId: 'magnaguard-wing-leader',
  name: 'MagnaGuard Wing Leader',
  kind: 'unit',
  aspects: ['Command', 'Villainy'],
  traits: ['Separatist', 'Vehicle', 'Fighter'],
  cost: 3,
  power: 3,
  hp: 4,
  arena: 'space',
  actions: [
    {
      id: 'action',
      costs: [],
      limit: 'once-per-round',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'friendly',
            trait: 'Droid',
          },
          optional: false,
          bind: 'first',
          effects: [
            {
              kind: 'attack-bound',
              target: 'first',
              optional: false,
            },
            {
              kind: 'select-unit',
              filter: {
                controller: 'friendly',
                trait: 'Droid',
                otherThan: 'first',
              },
              optional: false,
              bind: 'chosen',
              effects: [
                {
                  kind: 'attack-bound',
                  target: 'chosen',
                  optional: false,
                  powerBonus: 0,
                },
              ],
              forAttack: {},
            },
          ],
          forAttack: {},
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
