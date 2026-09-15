import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-effects.json.
export const darthSidiousThePhantomMenace = {
  cardId: 'darth-sidious--the-phantom-menace',
  name: 'Darth Sidious, The Phantom Menace',
  kind: 'unit',
  aspects: ['Vigilance', 'Villainy'],
  traits: ['Force', 'Separatist', 'Sith'],
  unique: true,
  cost: 8,
  power: 6,
  hp: 8,
  arena: 'ground',
  restore: 2,
  triggers: [
    {
      id: 'when-played',
      timing: 'played',
      effects: [
        {
          kind: 'pay',
          costs: [
            {
              kind: 'force',
            },
          ],
          optional: true,
          effects: [
            {
              kind: 'defeat-units',
              filter: {
                withoutTrait: 'Sith',
                remainingHpAtMost: 3,
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
