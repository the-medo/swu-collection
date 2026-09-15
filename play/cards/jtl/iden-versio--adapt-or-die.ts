import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-interactions.json.
export const idenVersioAdaptOrDie = {
  cardId: 'iden-versio--adapt-or-die',
  name: 'Iden Versio, Adapt or Die',
  kind: 'unit',
  aspects: ['Vigilance', 'Villainy'],
  traits: ['Imperial', 'Pilot'],
  unique: true,
  cost: 4,
  power: 4,
  hp: 3,
  arena: 'ground',
  keywords: ['Shielded'],
  piloting: [
    {
      id: 'piloting',
      cost: 3,
      aspects: ['Vigilance', 'Villainy'],
    },
  ],
  upgrade: {
    attachTo: 'friendly-vehicle-without-pilot',
    modifiers: {
      power: 3,
      hp: 3,
    },
    triggers: [
      {
        id: 'attachment-shield',
        timing: 'attached',
        effects: [
          {
            kind: 'on-unit',
            target: 'subject',
            operation: {
              kind: 'give-token',
              token: 'shield',
              count: 1,
            },
          },
        ],
      },
    ],
  },
} as const satisfies UnitDefinition;
