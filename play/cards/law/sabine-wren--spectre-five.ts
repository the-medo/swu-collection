import type { UnitDefinition } from '../definition.ts';

// LAW 078. Printed text is pinned in meta-movement fixture.
export const sabineWrenSpectreFive = {
  cardId: 'sabine-wren--spectre-five',
  name: 'Sabine Wren, Spectre Five',
  kind: 'unit',
  aspects: ['Aggression', 'Cunning', 'Heroism'],
  traits: ['Mandalorian', 'Rebel', 'Spectre'],
  unique: true,
  cost: 3,
  power: 3,
  hp: 3,
  arena: 'ground',
  keywords: ['Ambush'],
  triggers: [
    {
      id: 'on-played',
      timing: 'played',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'units-at-least',
            filter: {
              controller: 'friendly',
              anyAspect: ['Vigilance', 'Command'],
            },
            amount: 1,
          },
          effects: [
            {
              kind: 'defeat-upgrade',
              optional: true,
            },
          ],
          otherwise: [
            {
              kind: 'defeat-upgrade',
              optional: true,
              nonUnique: true,
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
