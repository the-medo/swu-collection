import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-effects.json.
export const snapWexleyResistanceReconFlier = {
  cardId: 'snap-wexley--resistance-recon-flier',
  name: 'Snap Wexley, Resistance Recon Flier',
  kind: 'unit',
  aspects: ['Command', 'Heroism'],
  traits: ['Resistance', 'Pilot'],
  unique: true,
  cost: 3,
  power: 2,
  hp: 5,
  arena: 'ground',
  triggers: [
    {
      id: 'unit-discount',
      timing: 'played',
      effects: [
        {
          kind: 'next-play',
          filter: {
            trait: 'Resistance',
          },
          discount: 1,
        },
      ],
    },
    {
      id: 'attack-discount',
      timing: 'attack',
      effects: [
        {
          kind: 'next-play',
          filter: {
            trait: 'Resistance',
          },
          discount: 1,
        },
      ],
    },
  ],
  piloting: [
    {
      id: 'piloting',
      cost: 2,
      aspects: ['Command', 'Heroism'],
    },
  ],
  upgrade: {
    attachTo: 'friendly-vehicle-without-pilot',
    modifiers: {
      power: 2,
      hp: 2,
    },
    triggers: [
      {
        id: 'resistance-search',
        timing: 'played',
        effects: [
          {
            kind: 'search-deck',
            count: 5,
            filter: 'any',
            trait: 'Resistance',
            max: 1,
          },
        ],
      },
    ],
  },
} as const satisfies UnitDefinition;
