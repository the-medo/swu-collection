import catalog from './catalog.json';
import type {
  Abilities,
  Aspect,
  BaseDefinition,
  CardEffect,
  EventDefinition,
  LeaderDefinition,
  UnitDefinition,
  UpgradeDefinition,
} from '../definition.ts';

type HmwCard = (typeof catalog)[number];
type HmwType = HmwCard['type'];

const cards = new Map<string, HmwCard>(catalog.map(card => [card.cardId, card]));

function card(cardId: string, type: HmwType): HmwCard {
  const value = cards.get(cardId);
  if (!value || value.type !== type)
    throw new Error(`Invalid pinned Homeworlds ${type} definition: ${cardId}`);
  return value;
}

function identity(value: HmwCard) {
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

export function hmwUnit(cardId: string, overrides: UnitOverrides = {}): UnitDefinition {
  const value = card(cardId, 'Unit');
  const arena = value.arenas[0]?.toLowerCase();
  if (value.cost === null || value.power === null || value.hp === null || !arena)
    throw new Error(`Incomplete pinned Homeworlds unit identity: ${cardId}`);
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

export function hmwBase(cardId: string, abilities: Abilities = {}): BaseDefinition {
  const value = card(cardId, 'Base');
  if (value.hp === null) throw new Error(`Incomplete pinned Homeworlds base identity: ${cardId}`);
  return { ...identity(value), kind: 'base', hp: value.hp, ...abilities };
}

type UpgradeOverrides = Omit<
  Partial<UpgradeDefinition>,
  'cardId' | 'name' | 'kind' | 'aspects' | 'traits' | 'unique' | 'cost' | 'token' | 'modifiers'
>;

export function hmwUpgrade(cardId: string, overrides: UpgradeOverrides = {}): UpgradeDefinition {
  const value = card(cardId, 'Upgrade');
  if (value.cost === null)
    throw new Error(`Incomplete pinned Homeworlds upgrade identity: ${cardId}`);
  const fortify = /(?:\{fortify\}|\bfortify\b)/i.test(value.text ?? '');
  return {
    ...identity(value),
    kind: 'upgrade',
    cost: value.cost,
    token: false,
    modifiers: { power: value.upgradePower ?? 0, hp: value.upgradeHp ?? 0 },
    attachTo: fortify ? 'base' : 'unit',
    ...(fortify ? { keywords: ['Fortify'] as const } : {}),
    ...overrides,
  };
}

type EventOverrides = Omit<
  Partial<EventDefinition>,
  'cardId' | 'name' | 'kind' | 'aspects' | 'traits' | 'unique' | 'cost' | 'effects'
>;

export function hmwEvent(
  cardId: string,
  effects: readonly CardEffect[],
  overrides: EventOverrides = {},
): EventDefinition {
  const value = card(cardId, 'Event');
  if (value.cost === null)
    throw new Error(`Incomplete pinned Homeworlds event identity: ${cardId}`);
  return { ...identity(value), kind: 'event', cost: value.cost, effects, ...overrides };
}

export function hmwLeader(
  cardId: string,
  faces: { leader?: Abilities; unit?: Abilities } = {},
): LeaderDefinition {
  const value = card(cardId, 'Leader');
  const arena = value.arenas[0]?.toLowerCase();
  if (value.cost === null || value.power === null || value.hp === null || !arena)
    throw new Error(`Incomplete pinned Homeworlds leader identity: ${cardId}`);
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
