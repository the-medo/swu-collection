import type { UpgradeDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 conditional ability fixture.
export const battleFury = {
  cardId: 'battle-fury',
  name: 'Battle Fury',
  kind: 'upgrade',
  aspects: ['Aggression', 'Villainy'],
  traits: ['Innate'],
  cost: 2,
  token: false,
  modifiers: {
    power: 3,
    hp: 3,
  },
  attachTo: 'unit',
  grants: {
    triggers: [
      {
        id: 'discard',
        timing: 'attack',
        effects: [
          {
            kind: 'inspect-zone',
            zone: 'hand',
            player: 'self',
            chooser: 'owner',
            filter: {},
            min: 1,
            max: 1,
            bind: 'discard',
            effects: [
              {
                kind: 'move-card',
                target: 'discard',
                from: 'hand',
                to: 'discard',
                effects: [],
              },
            ],
          },
        ],
      },
    ],
  },
} as const satisfies UpgradeDefinition;
