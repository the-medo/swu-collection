import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteSmugglingCompartment = {
  cardId: 'smuggling-compartment',
  name: 'Smuggling Compartment',
  kind: 'upgrade',
  aspects: ['Cunning'],
  traits: ['Modification'],
  cost: 1,
  token: false,
  modifiers: {
    power: 1,
    hp: 1,
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
            kind: 'select-resources',
            player: 'self',
            exhausted: 'any',
            min: 1,
            max: 1,
            operation: 'ready',
          },
        ],
      },
    ],
  },
} as const satisfies UpgradeDefinition;
