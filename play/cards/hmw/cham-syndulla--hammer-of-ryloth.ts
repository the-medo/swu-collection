import { hmwLeader } from './define.ts';

export const hmwChamSyndullaHammerOfRyloth = hmwLeader('cham-syndulla--hammer-of-ryloth', {
  leader: {
    triggers: [
      {
        id: 'retaliate',
        timing: 'non-combat-damage',
        optional: true,
        effects: [
          {
            kind: 'exhaust-leader',
            effects: [
              {
                kind: 'select-target',
                units: {
                  controller: 'enemy',
                },
                bases: 'enemy',
                bind: 'chosen',
                optional: false,
                effects: [
                  {
                    kind: 'damage-target',
                    target: 'chosen',
                    amount: 1,
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  unit: {
    triggers: [
      {
        id: 'retaliate',
        timing: 'non-combat-damage',
        optional: true,
        effects: [
          {
            kind: 'select-target',
            units: {
              controller: 'enemy',
            },
            bases: 'enemy',
            bind: 'chosen',
            optional: false,
            effects: [
              {
                kind: 'damage-target',
                target: 'chosen',
                amount: 1,
              },
            ],
          },
        ],
      },
    ],
  },
});
