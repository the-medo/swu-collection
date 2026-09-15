import type { UnitDefinition } from '../definition.ts';

// The official erratum limits the -2 power to the defending unit; bases are unaffected.
// Official identity and printed text are pinned in testing/fixtures/ibh.json.
export const hanSoloScruffyLookingNerfHerder = {
  cardId: 'han-solo--scruffy-looking-nerf-herder',
  name: 'Han Solo, Scruffy-Looking Nerf Herder',
  kind: 'unit',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Rebel'],
  unique: true,
  cost: 6,
  power: 4,
  hp: 6,
  arena: 'ground',
  raid: 2,
  triggers: [
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'on-unit',
          target: 'defender',
          operation: {
            kind: 'modify',
            power: -2,
            hp: 0,
            duration: 'attack',
          },
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
