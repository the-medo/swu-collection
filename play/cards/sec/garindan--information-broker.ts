import type { UnitDefinition } from '../definition.ts';
// Card names use titles, ignoring subtitles (v8 §8.17).
export const garindanInformationBroker = {
  cardId: 'garindan--information-broker',
  kind: 'unit',
  unique: true,
  arena: 'ground',
  name: 'Garindan, Information Broker',
  cost: 2,
  power: 1,
  hp: 3,
  aspects: ['Cunning', 'Villainy'],
  traits: ['Underworld'],
  keywords: ['Plot'],
  triggers: [
    {
      id: 'name-card',
      timing: 'played',
      effects: [
        {
          kind: 'name-card',
          bind: 'chosen',
          effects: [
            {
              kind: 'inspect-zone',
              zone: 'hand',
              player: 'enemy',
              chooser: 'self',
              filter: { named: 'chosen' },
              min: 1,
              max: 1,
              bind: 'discard',
              effects: [{ kind: 'move-card', target: 'discard', from: 'hand', to: 'discard' }],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
