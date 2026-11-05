import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteLukeSkywalkerJediKnight = {
  cardId: 'luke-skywalker--jedi-knight',
  name: 'Luke Skywalker, Jedi Knight',
  kind: 'unit',
  aspects: ['Vigilance', 'Heroism'],
  traits: ['Force', 'Jedi', 'Rebel'],
  cost: 7,
  unique: true,
  power: 6,
  hp: 7,
  arena: 'ground',
  restore: 3,
  triggers: [
    {
      id: 'played',
      timing: 'played',
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
              kind: 'if',
              condition: {
                kind: 'friendly-unit-defeated',
              },
              effects: [
                {
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'modify',
                    power: -6,
                    hp: -6,
                    duration: 'phase',
                  },
                },
              ],
              otherwise: [
                {
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'modify',
                    power: -3,
                    hp: -3,
                    duration: 'phase',
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
