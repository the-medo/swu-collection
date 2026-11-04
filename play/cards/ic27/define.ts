import catalog from './catalog.json';
import type {
  Abilities,
  Aspect,
  CardEffect,
  EventDefinition,
  LeaderDefinition,
  UnitDefinition,
} from '../definition.ts';

type Ic27Card = (typeof catalog)[number];
type Ic27Type = Ic27Card['type'];

const cards = new Map<string, Ic27Card>(catalog.map(card => [card.cardId, card]));

function card(cardId: string, type: Ic27Type): Ic27Card {
  const value = cards.get(cardId);
  if (!value || value.type !== type)
    throw new Error(`Invalid pinned Icons 2027 ${type} definition: ${cardId}`);
  return value;
}

function identity(value: Ic27Card) {
  return {
    cardId: value.cardId,
    name: value.name,
    aspects: value.aspects as Aspect[],
    traits: value.traits,
    ...(value.subtitle?.trim() ? ({ unique: true } as const) : {}),
  };
}

type UnitOverrides = Omit<
  Partial<UnitDefinition>,
  'cardId' | 'name' | 'kind' | 'aspects' | 'traits' | 'unique' | 'cost' | 'power' | 'hp' | 'arena'
>;

export function ic27Unit(cardId: string, overrides: UnitOverrides = {}): UnitDefinition {
  const value = card(cardId, 'Unit');
  const arena = value.arenas[0]?.toLowerCase();
  if (value.cost === null || value.power === null || value.hp === null || !arena)
    throw new Error(`Incomplete pinned Icons 2027 unit identity: ${cardId}`);
  return {
    ...identity(value),
    kind: 'unit',
    cost: value.cost,
    power: value.power,
    hp: value.hp,
    arena: arena as UnitDefinition['arena'],
    ...overrides,
  };
}

type EventOverrides = Omit<
  Partial<EventDefinition>,
  'cardId' | 'name' | 'kind' | 'aspects' | 'traits' | 'unique' | 'cost' | 'effects'
>;

export function ic27Event(
  cardId: string,
  effects: readonly CardEffect[],
  overrides: EventOverrides = {},
): EventDefinition {
  const value = card(cardId, 'Event');
  if (value.cost === null)
    throw new Error(`Incomplete pinned Icons 2027 event identity: ${cardId}`);
  return { ...identity(value), kind: 'event', cost: value.cost, effects, ...overrides };
}

export function ic27Leader(
  cardId: string,
  faces: { leader?: Abilities; unit?: Abilities } = {},
): LeaderDefinition {
  const value = card(cardId, 'Leader');
  const arena = value.arenas[0]?.toLowerCase();
  if (value.cost === null || value.power === null || value.hp === null || !arena)
    throw new Error(`Incomplete pinned Icons 2027 leader identity: ${cardId}`);
  const leader = faces.leader ?? {};
  return {
    ...identity(value),
    unique: true,
    kind: 'leader',
    printedCost: value.cost,
    faces: {
      leader: {
        ...leader,
        actions: [
          ...(leader.actions ?? []),
          {
            id: 'deploy',
            costs: [],
            limit: 'once-per-game',
            effects: [
              {
                kind: 'deploy',
                as: 'unit',
                condition: { kind: 'resources-at-least', amount: value.cost },
              },
            ],
          },
        ],
      },
      unit: {
        power: value.power,
        hp: value.hp,
        arena: arena as UnitDefinition['arena'],
        ...(faces.unit ?? {}),
      },
    },
  };
}
