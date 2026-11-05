import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteSabineWrenExplosivesArtist = {
  cardId: 'sabine-wren--explosives-artist',
  name: 'Sabine Wren, Explosives Artist',
  kind: 'unit',
  aspects: ['Aggression', 'Heroism'],
  traits: ['Mandalorian', 'Rebel', 'Spectre'],
  cost: 2,
  unique: true,
  power: 2,
  hp: 3,
  arena: 'ground',
  protectFromAttackUnlessSentinel: [
    {
      sameAs: 'source',
      condition: {
        kind: 'numeric-at-least',
        value: {
          kind: 'unit-aspects',
          filter: {
            controller: 'friendly',
            otherThan: 'source',
          },
        },
        amount: 3,
      },
    },
  ],
  triggers: [
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'select-target',
          units: {
            sameAs: 'defender',
          },
          bases: 'any',
          bind: 'victim',
          optional: true,
          effects: [
            {
              kind: 'damage-target',
              target: 'victim',
              amount: 1,
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
