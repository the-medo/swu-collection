import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteFennRauProtectorOfConcordDawn = {
  cardId: 'fenn-rau--protector-of-concord-dawn',
  name: 'Fenn Rau, Protector of Concord Dawn',
  kind: 'unit',
  aspects: ['Vigilance'],
  traits: ['Mandalorian'],
  cost: 6,
  unique: true,
  power: 5,
  hp: 6,
  arena: 'ground',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'play-card',
          from: 'hand',
          filter: {
            kind: 'upgrade',
          },
          optional: true,
          discount: 2,
        },
      ],
    },
    {
      id: 'upgrade-played-on-self',
      timing: 'upgrade-played-on-self',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'enemy',
          },
          optional: false,
          bind: 'chosen',
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'modify',
                power: -2,
                hp: -2,
                duration: 'phase',
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
