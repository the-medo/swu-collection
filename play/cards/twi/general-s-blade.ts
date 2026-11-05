import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteGeneralSBlade = {
  cardId: 'general-s-blade',
  name: "General's Blade",
  kind: 'upgrade',
  aspects: ['Command'],
  traits: ['Item', 'Weapon', 'Lightsaber'],
  cost: 3,
  token: false,
  modifiers: {
    power: 3,
    hp: 3,
  },
  attachTo: 'non-vehicle',
  grantsIf: {
    trait: 'Jedi',
  },
  grants: {
    triggers: [
      {
        id: 'attack',
        timing: 'attack',
        effects: [
          {
            kind: 'next-play',
            filter: {
              kind: 'unit',
            },
            discount: 2,
          },
        ],
      },
    ],
  },
} as const satisfies UpgradeDefinition;
