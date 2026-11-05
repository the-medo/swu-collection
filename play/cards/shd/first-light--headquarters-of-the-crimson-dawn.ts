import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteFirstLightHeadquartersOfTheCrimsonDawn = {
  cardId: 'first-light--headquarters-of-the-crimson-dawn',
  name: 'First Light, Headquarters of the Crimson Dawn',
  kind: 'unit',
  aspects: ['Villainy', 'Vigilance'],
  traits: ['Underworld', 'Vehicle', 'Transport'],
  cost: 7,
  unique: true,
  power: 4,
  hp: 7,
  arena: 'space',
  keywords: ['Grit'],
  auras: [
    {
      id: 'aura',
      filter: {
        controller: 'friendly',
        nonLeader: true,
        otherThan: 'source',
      },
      abilities: {
        keywords: ['Grit'],
      },
    },
  ],
  smuggle: [
    {
      id: 'smuggle',
      cost: 7,
      aspects: ['Vigilance', 'Villainy'],
      damageFriendlyUnit: 4,
    },
  ],
} as const satisfies UnitDefinition;
