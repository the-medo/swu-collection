import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-effects.json.
export const stolenStarpathUnit = {
  cardId: 'stolen-starpath-unit',
  name: 'Stolen Starpath Unit',
  kind: 'upgrade',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Item', 'Modification'],
  cost: 1,
  token: false,
  modifiers: {
    power: 1,
    hp: 1,
  },
  attachTo: 'unit',
  grants: {
    triggers: [
      {
        id: 'attack',
        timing: 'attack',
        effects: [
          {
            kind: 'name-card',
            bind: 'named',
            effects: [
              {
                kind: 'reveal-hand',
                player: 'enemy',
                count: {
                  filter: {
                    named: 'named',
                  },
                  bind: 'copies',
                },
                effects: [
                  {
                    kind: 'create-unit',
                    cardId: 'spy',
                    count: {
                      kind: 'value',
                      name: 'copies',
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
