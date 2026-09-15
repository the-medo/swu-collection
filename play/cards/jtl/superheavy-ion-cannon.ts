import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-effects.json.
export const superheavyIonCannon = {
  cardId: 'superheavy-ion-cannon',
  name: 'Superheavy Ion Cannon',
  kind: 'upgrade',
  aspects: ['Cunning'],
  traits: ['Modification', 'Weapon'],
  cost: 2,
  token: false,
  modifiers: {
    power: 0,
    hp: 3,
  },
  attachTo: 'unit',
  attachFilter: {
    anyTrait: ['Capital Ship', 'Transport'],
  },
  grants: {
    triggers: [
      {
        id: 'ion-disable',
        timing: 'attack',
        effects: [
          {
            kind: 'select-unit',
            filter: {
              controller: 'enemy',
              nonLeader: true,
            },
            bind: 'chosen',
            optional: true,
            effects: [
              {
                kind: 'on-unit',
                target: 'chosen',
                operation: {
                  kind: 'exhaust',
                },
                ifYouDo: [
                  {
                    kind: 'indirect-damage',
                    amount: {
                      kind: 'unit-stat',
                      target: 'chosen',
                      stat: 'power',
                    },
                    recipient: 'defender',
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
