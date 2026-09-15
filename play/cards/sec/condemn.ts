import type { UpgradeDefinition } from '../definition.ts';

// SEC 038. Printed text and rulings are pinned in meta-disclose fixture.
export const condemn = {
  cardId: 'condemn',
  name: 'Condemn',
  kind: 'upgrade',
  aspects: ['Vigilance', 'Villainy'],
  traits: ['Condition'],
  cost: 3,
  token: false,
  modifiers: {
    power: 0,
    hp: 0,
  },
  attachTo: 'unit',
  attackOverride: [
    {
      id: 'condemn',
      timing: 'attack',
      effects: [
        {
          kind: 'disclose',
          aspects: ['Vigilance', 'Villainy'],
          effects: [
            {
              kind: 'on-unit',
              target: 'source',
              operation: {
                kind: 'modify',
                power: -6,
                hp: 0,
                duration: 'attack',
              },
            },
          ],
          player: 'defender',
        },
      ],
    },
  ],
} as const satisfies UpgradeDefinition;
