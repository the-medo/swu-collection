import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteCargoJuggernaut = {
  cardId: 'cargo-juggernaut',
  name: 'Cargo Juggernaut',
  kind: 'unit',
  aspects: ['Vigilance'],
  traits: ['Vehicle', 'Tank'],
  cost: 6,
  power: 4,
  hp: 6,
  arena: 'ground',
  keywords: ['Shielded'],
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'units-at-least',
            filter: {
              controller: 'friendly',
              otherThan: 'source',
              anyAspect: ['Vigilance'],
            },
            amount: 1,
          },
          effects: [
            {
              kind: 'heal-own-base',
              amount: 4,
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
