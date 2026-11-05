import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteArmedToTheTeeth = {
  cardId: 'armed-to-the-teeth',
  name: 'Armed to the Teeth',
  kind: 'upgrade',
  aspects: ['Aggression'],
  traits: ['Supply', 'Weapon'],
  cost: 2,
  token: false,
  modifiers: {
    power: 2,
    hp: 0,
  },
  attachTo: 'unit',
  smuggle: [
    {
      id: 'smuggle',
      cost: 4,
      aspects: ['Aggression'],
    },
  ],
  grants: {
    triggers: [
      {
        id: 'attack',
        timing: 'attack',
        effects: [
          {
            kind: 'select-unit',
            filter: {
              controller: 'friendly',
              otherThan: 'source',
            },
            optional: false,
            bind: 'chosen',
            effects: [
              {
                kind: 'on-unit',
                target: 'chosen',
                operation: {
                  kind: 'modify',
                  power: 2,
                  hp: 0,
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
