import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteHardpointHeavyBlaster = {
  cardId: 'hardpoint-heavy-blaster',
  name: 'Hardpoint Heavy Blaster',
  kind: 'upgrade',
  aspects: ['Command'],
  traits: ['Modification', 'Weapon'],
  cost: 2,
  token: false,
  modifiers: {
    power: 2,
    hp: 2,
  },
  attachTo: 'unit',
  attachFilter: {
    trait: 'Vehicle',
  },
  grants: {
    triggers: [
      {
        id: 'attack',
        timing: 'attack',
        effects: [
          {
            kind: 'if',
            condition: {
              kind: 'unit-matches',
              target: 'defender',
              filter: {},
            },
            effects: [
              {
                kind: 'select-unit',
                filter: {
                  sameArenaAs: 'defender',
                },
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
          },
        ],
      },
    ],
  },
} as const satisfies UpgradeDefinition;
