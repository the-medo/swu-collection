import type { UpgradeDefinition } from '../definition.ts';

// Official text is pinned in leader-smuggle.json.
export const hotshotDl44Blaster = {
  cardId: 'hotshot-dl-44-blaster',
  name: 'Hotshot DL-44 Blaster',
  kind: 'upgrade',
  cost: 1,
  aspects: ['Aggression'],
  traits: ['Item', 'Weapon'],
  smuggle: [
    {
      id: 'smuggle',
      cost: 3,
      aspects: ['Cunning'],
    },
  ],
  token: false,
  modifiers: {
    power: 2,
    hp: 0,
  },
  attachTo: 'non-vehicle',
  triggers: [
    {
      id: 'smuggle-attack',
      timing: 'played',
      condition: {
        kind: 'numeric-at-least',
        value: {
          kind: 'value',
          name: 'played-using-smuggle',
        },
        amount: 1,
      },
      effects: [
        {
          kind: 'attack-bound',
          target: 'attached',
          optional: false,
        },
      ],
    },
  ],
} as const satisfies UpgradeDefinition;
