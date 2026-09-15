import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-effects.json.
export const nuteGunrayEscapingJustice = {
  cardId: 'nute-gunray--escaping-justice',
  name: 'Nute Gunray, Escaping Justice',
  kind: 'unit',
  aspects: ['Vigilance', 'Villainy'],
  traits: ['Separatist', 'Official'],
  unique: true,
  cost: 3,
  power: 3,
  hp: 4,
  arena: 'ground',
  keywords: ['Grit'],
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'friendly',
            otherThan: 'source',
            trait: 'Official',
          },
          bind: 'chosen',
          optional: true,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'modify',
                power: 0,
                hp: 0,
                duration: 'phase',
                abilities: {
                  keywords: ['Sentinel'],
                },
              },
            },
          ],
        },
      ],
    },
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'friendly',
            otherThan: 'source',
            trait: 'Official',
          },
          bind: 'chosen',
          optional: true,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'modify',
                power: 0,
                hp: 0,
                duration: 'phase',
                abilities: {
                  keywords: ['Sentinel'],
                },
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
