import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteKyloSTieSilencerRuthlesslyEfficient = {
  cardId: 'kylo-s-tie-silencer--ruthlessly-efficient',
  name: "Kylo's TIE Silencer, Ruthlessly Efficient",
  kind: 'unit',
  aspects: ['Villainy', 'Aggression'],
  traits: ['First Order', 'Vehicle', 'Fighter'],
  cost: 2,
  unique: true,
  power: 3,
  hp: 2,
  arena: 'space',
  actions: [
    {
      id: 'action',
      costs: [],
      limit: null,
      effects: [
        {
          kind: 'play-card',
          from: 'discard',
          filter: {
            kind: 'unit',
          },
          optional: false,
          target: 'source',
        },
      ],
      zone: 'discard',
      requiresPlayable: true,
      condition: {
        kind: 'discarded-this-phase',
        target: 'source',
      },
    },
  ],
} as const satisfies UnitDefinition;
