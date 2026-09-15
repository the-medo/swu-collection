import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-attributes.json.
export const adventurerSniperRifle = {
  cardId: 'adventurer-sniper-rifle',
  name: 'Adventurer Sniper Rifle',
  kind: 'upgrade',
  aspects: ['Vigilance'],
  traits: ['Item', 'Weapon'],
  cost: 2,
  token: false,
  modifiers: {
    power: 0,
    hp: 0,
  },
  attachTo: 'non-vehicle',
  grants: {
    actions: [
      {
        id: 'snipe',
        costs: [
          {
            kind: 'exhaust-self',
          },
        ],
        limit: null,
        effects: [
          {
            kind: 'select-unit',
            filter: {
              nonLeader: true,
              arena: 'ground',
              damaged: false,
            },
            bind: 'chosen',
            optional: false,
            effects: [
              {
                kind: 'on-unit',
                target: 'chosen',
                operation: {
                  kind: 'modify',
                  power: 0,
                  hp: 0,
                  printedHp: 1,
                  duration: 'phase',
                },
              },
            ],
          },
        ],
      },
    ],
  },
} as const satisfies UpgradeDefinition;
