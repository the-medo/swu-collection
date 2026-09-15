import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-effects.json.
export const sithHolocron = {
  cardId: 'sith-holocron',
  name: 'Sith Holocron',
  kind: 'upgrade',
  aspects: ['Aggression', 'Villainy'],
  traits: ['Sith', 'Item'],
  cost: 1,
  token: false,
  modifiers: {
    power: 1,
    hp: 1,
  },
  attachTo: 'unit',
  attachFilter: {
    trait: 'Force',
  },
  grants: {
    triggers: [
      {
        id: 'power-through-pain',
        timing: 'attack',
        effects: [
          {
            kind: 'select-unit',
            filter: {
              controller: 'friendly',
            },
            bind: 'chosen',
            optional: true,
            effects: [
              {
                kind: 'on-unit',
                target: 'chosen',
                operation: {
                  kind: 'damage',
                  amount: 2,
                },
                ifYouDo: [
                  {
                    kind: 'on-unit',
                    target: 'source',
                    operation: {
                      kind: 'modify',
                      power: 2,
                      hp: 0,
                      duration: 'attack',
                    },
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
