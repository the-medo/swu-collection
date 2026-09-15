import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-final.json.
export const hondoOhnakaPlaysByHisOwnRules = {
  cardId: 'hondo-ohnaka--plays-by-his-own-rules',
  name: 'Hondo Ohnaka, Plays By His Own Rules',
  kind: 'unit',
  aspects: ['Cunning', 'Vigilance'],
  traits: ['Underworld'],
  unique: true,
  cost: 5,
  power: 3,
  hp: 7,
  arena: 'ground',
  lookAtDeckTop: true,
  actions: [
    {
      id: 'play-deck-top',
      requiresPlayable: true,
      costs: [],
      limit: 'once-per-round',
      effects: [
        {
          kind: 'play-card',
          from: 'deck',
          target: 'own-deck-top',
          filter: {},
          optional: false,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
