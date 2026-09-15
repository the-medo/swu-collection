import type { UnitDefinition } from '../definition.ts';

// LAW 101. Printed text is pinned in meta-board fixture.
export const lawbringerShadowOverLothal = {
  cardId: 'lawbringer--shadow-over-lothal',
  name: 'Lawbringer, Shadow Over Lothal',
  kind: 'unit',
  aspects: ['Vigilance', 'Villainy'],
  traits: ['Imperial', 'Vehicle', 'Capital Ship'],
  unique: true,
  cost: 8,
  power: 7,
  hp: 7,
  arena: 'space',
  triggers: [
    {
      id: 'on-played',
      timing: 'played',
      effects: [
        {
          kind: 'choose-mode',
          options: [
            {
              id: 'vigilance',
              effects: [
                {
                  kind: 'modify-units',
                  filter: {
                    controller: 'enemy',
                    anyAspect: ['Vigilance'],
                  },
                  operation: {
                    kind: 'modify',
                    power: -2,
                    hp: -2,
                    duration: 'phase',
                  },
                },
              ],
            },
            {
              id: 'command',
              effects: [
                {
                  kind: 'modify-units',
                  filter: {
                    controller: 'enemy',
                    anyAspect: ['Command'],
                  },
                  operation: {
                    kind: 'modify',
                    power: -2,
                    hp: -2,
                    duration: 'phase',
                  },
                },
              ],
            },
            {
              id: 'aggression',
              effects: [
                {
                  kind: 'modify-units',
                  filter: {
                    controller: 'enemy',
                    anyAspect: ['Aggression'],
                  },
                  operation: {
                    kind: 'modify',
                    power: -2,
                    hp: -2,
                    duration: 'phase',
                  },
                },
              ],
            },
            {
              id: 'cunning',
              effects: [
                {
                  kind: 'modify-units',
                  filter: {
                    controller: 'enemy',
                    anyAspect: ['Cunning'],
                  },
                  operation: {
                    kind: 'modify',
                    power: -2,
                    hp: -2,
                    duration: 'phase',
                  },
                },
              ],
            },
            {
              id: 'heroism',
              effects: [
                {
                  kind: 'modify-units',
                  filter: {
                    controller: 'enemy',
                    anyAspect: ['Heroism'],
                  },
                  operation: {
                    kind: 'modify',
                    power: -2,
                    hp: -2,
                    duration: 'phase',
                  },
                },
              ],
            },
            {
              id: 'villainy',
              effects: [
                {
                  kind: 'modify-units',
                  filter: {
                    controller: 'enemy',
                    anyAspect: ['Villainy'],
                  },
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
    },
    {
      id: 'on-attack',
      timing: 'attack',
      effects: [
        {
          kind: 'choose-mode',
          options: [
            {
              id: 'vigilance',
              effects: [
                {
                  kind: 'modify-units',
                  filter: {
                    controller: 'enemy',
                    anyAspect: ['Vigilance'],
                  },
                  operation: {
                    kind: 'modify',
                    power: -2,
                    hp: -2,
                    duration: 'phase',
                  },
                },
              ],
            },
            {
              id: 'command',
              effects: [
                {
                  kind: 'modify-units',
                  filter: {
                    controller: 'enemy',
                    anyAspect: ['Command'],
                  },
                  operation: {
                    kind: 'modify',
                    power: -2,
                    hp: -2,
                    duration: 'phase',
                  },
                },
              ],
            },
            {
              id: 'aggression',
              effects: [
                {
                  kind: 'modify-units',
                  filter: {
                    controller: 'enemy',
                    anyAspect: ['Aggression'],
                  },
                  operation: {
                    kind: 'modify',
                    power: -2,
                    hp: -2,
                    duration: 'phase',
                  },
                },
              ],
            },
            {
              id: 'cunning',
              effects: [
                {
                  kind: 'modify-units',
                  filter: {
                    controller: 'enemy',
                    anyAspect: ['Cunning'],
                  },
                  operation: {
                    kind: 'modify',
                    power: -2,
                    hp: -2,
                    duration: 'phase',
                  },
                },
              ],
            },
            {
              id: 'heroism',
              effects: [
                {
                  kind: 'modify-units',
                  filter: {
                    controller: 'enemy',
                    anyAspect: ['Heroism'],
                  },
                  operation: {
                    kind: 'modify',
                    power: -2,
                    hp: -2,
                    duration: 'phase',
                  },
                },
              ],
            },
            {
              id: 'villainy',
              effects: [
                {
                  kind: 'modify-units',
                  filter: {
                    controller: 'enemy',
                    anyAspect: ['Villainy'],
                  },
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
    },
  ],
} as const satisfies UnitDefinition;
