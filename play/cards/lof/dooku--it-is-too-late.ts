import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-effects.json.
export const dookuItIsTooLate = {
  cardId: 'dooku--it-is-too-late',
  name: 'Dooku, It Is Too Late',
  kind: 'unit',
  aspects: ['Cunning'],
  traits: ['Force', 'Jedi'],
  unique: true,
  cost: 4,
  power: 5,
  hp: 4,
  arena: 'ground',
  keywords: ['Hidden'],
  triggers: [
    {
      id: 'when-played',
      timing: 'played',
      effects: [
        {
          kind: 'modify-units',
          filter: {
            controller: 'friendly',
            hasKeyword: 'Hidden',
          },
          operation: {
            kind: 'modify',
            power: 0,
            hp: 0,
            duration: 'phase',
            cannotBeAttacked: true,
          },
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
