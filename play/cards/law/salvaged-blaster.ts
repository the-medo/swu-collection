import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-history.json.
export const salvagedBlaster = {
  cardId: 'salvaged-blaster',
  name: 'Salvaged Blaster',
  kind: 'upgrade',
  aspects: ['Aggression'],
  traits: ['Item', 'Weapon'],
  cost: 2,
  token: false,
  modifiers: {
    power: 2,
    hp: 0,
  },
  attachTo: 'non-vehicle',
  actions: [
    {
      id: 'play-from-discard',
      zone: 'discard',
      costs: [],
      limit: null,
      condition: {
        kind: 'discarded-this-phase',
        target: 'source',
      },
      effects: [
        {
          kind: 'play-card',
          from: 'discard',
          target: 'source',
          filter: {},
          optional: false,
        },
      ],
    },
  ],
} as const satisfies UpgradeDefinition;
