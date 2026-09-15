import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-effects.json.
export const enfysNestSHelmet = {
  cardId: 'enfys-nest-s-helmet',
  name: "Enfys Nest's Helmet",
  kind: 'upgrade',
  aspects: ['Aggression', 'Heroism'],
  traits: ['Item', 'Armor'],
  unique: true,
  cost: 2,
  token: false,
  modifiers: {
    power: 0,
    hp: 2,
  },
  attachTo: 'non-vehicle',
  grants: {
    triggers: [
      {
        id: 'attack',
        timing: 'attack',
        effects: [
          {
            kind: 'select-unit',
            filter: {
              otherThan: 'source',
            },
            bind: 'chosen',
            optional: true,
            effects: [
              {
                kind: 'on-unit',
                target: 'chosen',
                operation: {
                  kind: 'modify',
                  power: 3,
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
