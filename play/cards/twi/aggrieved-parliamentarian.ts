import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteAggrievedParliamentarian = {
  cardId: 'aggrieved-parliamentarian',
  name: 'Aggrieved Parliamentarian',
  kind: 'unit',
  aspects: [],
  traits: ['Separatist', 'Official'],
  cost: 2,
  power: 2,
  hp: 2,
  arena: 'ground',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'inspect-zone',
          zone: 'discard',
          player: 'enemy',
          chooser: 'self',
          filter: {},
          min: {
            kind: 'zone-size',
            zone: 'discard',
            player: 'enemy',
          },
          max: {
            kind: 'zone-size',
            zone: 'discard',
            player: 'enemy',
          },
          bind: 'card',
          effects: [
            {
              kind: 'bottom-deck-group',
              group: 'discard-pile',
              from: 'discard',
            },
          ],
          group: 'discard-pile',
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
