import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-effects.json.
export const chairmanPapanoidaUndauntedDiplomat = {
  cardId: 'chairman-papanoida--undaunted-diplomat',
  name: 'Chairman Papanoida, Undaunted Diplomat',
  kind: 'unit',
  aspects: ['Aggression', 'Aggression'],
  traits: ['Republic', 'Official'],
  unique: true,
  cost: 3,
  power: 2,
  hp: 6,
  arena: 'ground',
  triggers: [
    {
      id: 'cards-drawn',
      timing: 'cards-drawn',
      effects: [
        {
          kind: 'disclose',
          aspects: ['Aggression', 'Aggression'],
          effects: [
            {
              kind: 'create-unit',
              cardId: 'spy',
              count: 1,
            },
          ],
        },
      ],
      condition: {
        kind: 'phase',
        phase: 'action',
      },
    },
    {
      id: 'enemy-cards-drawn',
      timing: 'enemy-cards-drawn',
      effects: [
        {
          kind: 'disclose',
          aspects: ['Aggression', 'Aggression'],
          effects: [
            {
              kind: 'create-unit',
              cardId: 'spy',
              count: 1,
            },
          ],
        },
      ],
      condition: {
        kind: 'phase',
        phase: 'action',
      },
    },
  ],
} as const satisfies UnitDefinition;
