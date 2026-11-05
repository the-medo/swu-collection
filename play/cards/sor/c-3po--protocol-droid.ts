import type { UnitDefinition } from '../definition.ts';

// Reprinted in IC27 188; identity and text follow the official catalog.
export const ic27ReprintC3poProtocolDroid = {
  cardId: 'c-3po--protocol-droid',
  name: 'C-3PO, Protocol Droid',
  kind: 'unit',
  aspects: ['Heroism'],
  traits: ['Rebel', 'Droid'],
  cost: 2,
  unique: true,
  power: 1,
  hp: 4,
  arena: 'ground',
  triggers: (['played', 'attack'] as const).map(timing => ({
    id: timing,
    timing,
    effects: [
      {
        kind: 'choose-number',
        bind: 'number',
        effects: [
          {
            kind: 'inspect-zone',
            zone: 'deck',
            player: 'self',
            chooser: 'self',
            top: 1,
            filter: { costEquals: { kind: 'value', name: 'number' } },
            min: 0,
            max: 1,
            bind: 'top',
            effects: [
              {
                kind: 'reveal-card',
                target: 'top',
                effects: [{ kind: 'draw-card', target: 'top' }],
              },
            ],
          },
        ],
      },
    ],
  })),
} as const satisfies UnitDefinition;
