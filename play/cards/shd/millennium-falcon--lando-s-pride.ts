import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteMillenniumFalconLandoSPride = {
  cardId: 'millennium-falcon--lando-s-pride',
  name: "Millennium Falcon, Lando's Pride",
  kind: 'unit',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Underworld', 'Vehicle', 'Transport'],
  cost: 6,
  unique: true,
  power: 5,
  hp: 5,
  arena: 'space',
  smuggle: [
    {
      id: 'smuggle',
      cost: 6,
      aspects: ['Cunning', 'Heroism'],
    },
  ],
  handPlayAbilities: {
    keywords: ['Ambush'],
  },
} as const satisfies UnitDefinition;
