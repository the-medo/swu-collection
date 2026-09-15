import type { UnitDefinition } from '../definition.ts';
// Card names use titles, ignoring subtitles (v8 §8.17).
export const ryderAzadiRestoredGovernor = {
  cardId: 'ryder-azadi--restored-governor',
  kind: 'unit',
  unique: true,
  arena: 'ground',
  name: 'Ryder Azadi, Restored Governor',
  cost: 3,
  power: 2,
  hp: 5,
  aspects: ['Vigilance'],
  traits: ['New Republic', 'Official'],
  restore: 1,
  triggers: [
    {
      id: 'name-card',
      timing: 'played',
      effects: [
        {
          kind: 'name-card',
          bind: 'chosen',
          effects: [{ kind: 'restrict-named-card', name: 'chosen', restriction: 'prevent-play' }],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
