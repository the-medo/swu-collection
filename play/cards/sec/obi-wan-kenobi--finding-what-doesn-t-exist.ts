import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-sequences.json.
export const obiWanKenobiFindingWhatDoesnTExist = {
  cardId: 'obi-wan-kenobi--finding-what-doesn-t-exist',
  name: "Obi-Wan Kenobi, Finding What Doesn't Exist",
  kind: 'unit',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Force', 'Jedi', 'Republic'],
  unique: true,
  cost: 4,
  power: 4,
  hp: 5,
  arena: 'ground',
  triggers: [
    {
      id: 'combat-damage',
      timing: 'combat-base-damage-dealt',
      effects: [
        {
          kind: 'mill',
          player: 'defender',
          count: 1,
          bind: 'discarded',
          effects: [
            {
              kind: 'grant-discard-play',
              target: 'discarded',
              player: 'self',
              free: false,
              ignoreAspectPenalties: true,
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
