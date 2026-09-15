import type { UnitDefinition } from '../definition.ts';
// Card names use titles, ignoring subtitles (v8 §8.17).
export const galenErsoYouLlNeverWin = {
  cardId: 'galen-erso--you-ll-never-win',
  kind: 'unit',
  unique: true,
  arena: 'ground',
  name: "Galen Erso, You'll Never Win",
  cost: 4,
  power: 3,
  hp: 5,
  aspects: ['Vigilance', 'Heroism'],
  traits: ['Imperial'],
  keywords: ['Plot'],
  triggers: [
    {
      id: 'name-card',
      timing: 'played',
      effects: [
        {
          kind: 'name-card',
          bind: 'chosen',
          effects: [{ kind: 'restrict-named-card', name: 'chosen', restriction: 'lose-abilities' }],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
