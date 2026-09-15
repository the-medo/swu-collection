import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-effects.json.
export const ornFreeTaaPoliticalPowerBroker = {
  cardId: 'orn-free-taa--political-power-broker',
  name: 'Orn Free Taa, Political Power Broker',
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Republic', "Twi'lek", 'Official'],
  unique: true,
  cost: 2,
  power: 0,
  hp: 4,
  arena: 'ground',
  constant: [
    {
      condition: {
        kind: 'always',
      },
      power: {
        kind: 'zone-size',
        player: 'self',
        zone: 'discard',
        filter: {
          trait: 'Law',
        },
      },
    },
  ],
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'search-deck',
          count: 10,
          filter: 'any',
          trait: 'Law',
          max: 1,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
