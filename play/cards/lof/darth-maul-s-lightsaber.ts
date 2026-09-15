import type { UpgradeDefinition } from '../definition.ts';

// LOF 140. Printed text and rulings are pinned in meta-disclose fixture.
export const darthMaulSLightsaber = {
  cardId: 'darth-maul-s-lightsaber',
  name: "Darth Maul's Lightsaber",
  kind: 'upgrade',
  aspects: ['Aggression', 'Villainy'],
  traits: ['Item', 'Weapon', 'Lightsaber'],
  cost: 3,
  token: false,
  modifiers: {
    power: 4,
    hp: 2,
  },
  attachTo: 'non-vehicle',
  attachFilter: {
    controller: 'friendly',
  },
  triggers: [
    {
      id: 'on-played',
      timing: 'played',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'unit-matches',
            target: 'attached',
            filter: {
              name: 'Darth Maul',
            },
          },
          effects: [
            {
              kind: 'attack-bound',
              target: 'attached',
              unitsOnly: true,
              optional: true,
              abilities: {
                keywords: ['Overwhelm'],
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UpgradeDefinition;
