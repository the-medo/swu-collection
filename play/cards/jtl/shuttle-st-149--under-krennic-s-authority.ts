import type { UnitDefinition } from '../definition.ts';

// Printed text and rulings are pinned in the meta-attachments fixture.
export const shuttleSt149UnderKrennicSAuthority = {
  cardId: 'shuttle-st-149--under-krennic-s-authority',
  name: "Shuttle ST-149, Under Krennic's Authority",
  kind: 'unit',
  aspects: ['Villainy'],
  traits: ['Imperial', 'Vehicle', 'Transport'],
  cost: 4,
  unique: true,
  power: 3,
  hp: 4,
  arena: 'space',
  keywords: ['Shielded'],
  triggers: [
    {
      id: 'move-token-played',
      timing: 'played',
      effects: [
        {
          kind: 'select-upgrades',
          filter: {
            token: true,
          },
          min: 0,
          max: 1,
          bind: 'token',
          effects: [
            {
              kind: 'take-control-upgrade',
              target: 'token',
            },
            {
              kind: 'reattach-upgrade',
              target: 'token',
            },
          ],
        },
      ],
    },
    {
      id: 'move-token-defeated',
      timing: 'defeated',
      effects: [
        {
          kind: 'select-upgrades',
          filter: {
            token: true,
          },
          min: 0,
          max: 1,
          bind: 'token',
          effects: [
            {
              kind: 'take-control-upgrade',
              target: 'token',
            },
            {
              kind: 'reattach-upgrade',
              target: 'token',
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
