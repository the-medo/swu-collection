import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-foundations.json.
export const onyxCinderAdventureAwaits = {
  cardId: 'onyx-cinder--adventure-awaits',
  name: 'Onyx Cinder, Adventure Awaits',
  kind: 'unit',
  aspects: ['Aggression'],
  traits: ['Vehicle', 'Transport'],
  unique: true,
  cost: 6,
  power: 6,
  hp: 6,
  arena: 'space',
  keywords: ['Hidden'],
  auras: [
    {
      id: 'hide-allies',
      filter: {
        controller: 'friendly',
        otherThan: 'source',
      },
      abilities: {
        keywords: ['Hidden'],
      },
    },
  ],
} as const satisfies UnitDefinition;
