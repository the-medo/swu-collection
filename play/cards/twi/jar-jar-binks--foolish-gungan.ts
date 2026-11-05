import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteJarJarBinksFoolishGungan = {
  cardId: 'jar-jar-binks--foolish-gungan',
  name: 'Jar Jar Binks, Foolish Gungan',
  kind: 'unit',
  aspects: ['Cunning', 'Cunning'],
  traits: [],
  cost: 2,
  unique: true,
  power: 2,
  hp: 3,
  arena: 'ground',
  triggers: [
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'random-card',
          units: {},
          bases: true,
          bind: 'victim',
          effects: [
            {
              kind: 'damage-target',
              target: 'victim',
              amount: 2,
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
