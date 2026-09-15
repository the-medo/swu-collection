import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-effects.json.
export const nemikSManifesto = {
  cardId: 'nemik-s-manifesto',
  name: "Nemik's Manifesto",
  kind: 'upgrade',
  aspects: ['Aggression', 'Heroism'],
  traits: ['Item', 'Rebel'],
  unique: true,
  cost: 1,
  token: false,
  modifiers: {
    power: 1,
    hp: 1,
  },
  attachTo: 'non-vehicle',
  hostTraits: ['Rebel'],
  grants: {
    triggers: [
      {
        id: 'defeated',
        timing: 'defeated',
        effects: [
          {
            kind: 'select-target',
            bases: 'enemy',
            bind: 'base',
            optional: false,
            effects: [
              {
                kind: 'damage-target',
                target: 'base',
                amount: {
                  kind: 'unit-count',
                  filter: {
                    controller: 'friendly',
                    otherThan: 'source',
                    trait: 'Rebel',
                  },
                },
              },
            ],
          },
        ],
      },
    ],
  },
} as const satisfies UpgradeDefinition;
