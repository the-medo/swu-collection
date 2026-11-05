import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteMonMothmaVoiceOfTheRebellion = {
  cardId: 'mon-mothma--voice-of-the-rebellion',
  name: 'Mon Mothma, Voice Of The Rebellion',
  kind: 'unit',
  aspects: ['Heroism', 'Command'],
  traits: ['Rebel', 'Official'],
  cost: 2,
  unique: true,
  power: 1,
  hp: 3,
  arena: 'ground',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'search-deck',
          count: 5,
          max: 1,
          filter: 'any',
          trait: 'Rebel',
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
