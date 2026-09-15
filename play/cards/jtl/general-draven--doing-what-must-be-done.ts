import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-foundations.json.
export const generalDravenDoingWhatMustBeDone = {
  cardId: 'general-draven--doing-what-must-be-done',
  name: 'General Draven, Doing What Must Be Done',
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Rebel', 'Official'],
  unique: true,
  cost: 5,
  power: 2,
  hp: 5,
  arena: 'ground',
  triggers: [
    {
      id: 'launch-on-play',
      timing: 'played',
      effects: [
        {
          kind: 'create-unit',
          cardId: 'x-wing',
          count: 1,
        },
      ],
    },
    {
      id: 'launch-on-attack',
      timing: 'attack',
      effects: [
        {
          kind: 'create-unit',
          cardId: 'x-wing',
          count: 1,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
