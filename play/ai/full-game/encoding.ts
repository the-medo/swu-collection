import { bundledCatalog } from '../../cards/catalog.ts';
import type { GameView, VisibleCard } from '../../view/types.ts';
import { roster, leagueRoster } from './roster.ts';
import type { Candidate } from './choices.ts';
import { CommandBuilder } from './choices.ts';
import type { DeckSnapshot } from '../../admission/decks.ts';

const zones = ['base', 'hand', 'resources', 'ground', 'space', 'discard', 'captured'];
const definitions = new Map(bundledCatalog.data.cards.map(c => [c.cardId, c]));

function semantic(vector: number[], label: string | null | undefined, amount = 1) {
  if (!label) return;
  let hash = 2166136261;
  for (let i = 0; i < label.length; i++)
    hash = Math.imul(hash ^ label.charCodeAt(i), 16777619) >>> 0;
  const index = hash % vector.length;
  vector[index] = vector[index]! + (hash & 0x80000000 ? -amount : amount);
}
const remaining = (card: VisibleCard | undefined) => (card?.face?.hp ?? 0) - (card?.damage ?? 0);
const power = (card: VisibleCard | undefined) => card?.face?.power ?? 0;
const printedCost = (id: string | undefined) => {
  const d = id && definitions.get(id);
  return d && 'cost' in d ? d.cost : d && 'printedCost' in d ? (d.printedCost ?? 0) : 0;
};

// A bounded summary of legitimately observed events, updated for BOTH seats
// after every engine command. No handles or event IDs become numeric features.
// This is lossy memory, not a recurrent belief model or exact hand tracker.
export class VisibleMemory {
  readonly values = Array<number>(96).fill(0);
  readonly seen = new Set<string>();
  observe(view: GameView, self: string) {
    for (const event of view.events) {
      if (this.seen.has(event.id)) continue;
      this.seen.add(event.id);
      for (let i = 0; i < this.values.length; i++) this.values[i] = this.values[i]! * 0.99;
      const side = event.actor === self ? 'self' : 'other';
      semantic(this.values, `${side}:${event.type}`, 0.1);
      semantic(this.values, event.mode, 0.1);
      semantic(this.values, event.namedCard, 0.1);
      for (const card of event.cards) semantic(this.values, `${side}:${card.cardId}`, 0.1);
    }
  }
}

// Reference policy uses the same visible choices. It is an initial learning
// scaffold, not a qualified strategic opponent or a target baked into inference.
export function referenceScore(
  builder: CommandBuilder,
  candidate: Candidate,
  self: string,
): number {
  const cards = builder.view.cards;
  const card = (id: string | undefined) => cards.find(c => c.id === id);
  if (candidate.kind === 'finish') {
    if (builder.stage === 'number') return 1;
    const resources = cards.filter(
      c => c.controller === self && c.zone === 'resources' && c.face?.kind !== 'player-token',
    ).length;
    const wanted =
      builder.view.decision!.kind === 'resource' && resources < 10
        ? Math.max(1, builder.selection!.min)
        : (builder.selection?.min ?? 0);
    return builder.selected.length >= wanted ? 1000 : -1000;
  }
  if (candidate.kind === 'select') {
    const c = card(candidate.card);
    return builder.view.decision!.kind === 'resource'
      ? printedCost(c?.face?.cardId) * 2
      : (c?.controller === self ? 0 : 10) + power(c) + printedCost(c?.face?.cardId);
  }
  if (candidate.kind !== 'option') return 0;
  const o = candidate.option,
    source = card(o.cards[0]),
    target = card(o.cards[1]);
  if (o.kind === 'initiative') return o.playerId === self ? 100 : 0;
  if (o.kind === 'mulligan') return o.takeMulligan ? 0 : 100;
  if (o.kind === 'attack') {
    if (target?.face?.kind === 'base')
      return power(source) >= remaining(target) ? 2000 : 50 + power(source) * 2;
    if (power(source) >= remaining(target)) {
      const base = cards.find(c => c.controller === self && c.face?.kind === 'base');
      if (!target?.exhausted && power(target) >= remaining(base)) return 1500;
      return (
        65 +
        printedCost(target?.face?.cardId) * 3 -
        (power(target) >= remaining(source) ? printedCost(source?.face?.cardId) * 3 : 0)
      );
    }
    return 10;
  }
  if (o.kind === 'use-ability' && o.action?.deploymentAvailable) return 95;
  if (o.kind === 'play') return 80 + printedCost(source?.face?.cardId);
  if (o.kind === 'use-ability') return 60;
  if (o.kind === 'take-initiative') return 20;
  if (o.kind === 'pass') return -10;
  if (o.kind === 'decline-effect') return -5;
  return 30;
}

export function makeEncoding(
  roster: readonly { key: string; snapshot: DeckSnapshot }[],
  ownDeckRouting = false,
  frozenVocabulary?: readonly string[],
) {
  const vocabulary = frozenVocabulary
    ? [...frozenVocabulary]
    : [
        ...new Set([
          ...roster.flatMap(d => [
            d.snapshot.leader,
            d.snapshot.base,
            ...d.snapshot.mainboard.map(c => c.cardId),
          ]),
          ...bundledCatalog.data.cards.filter(c => 'token' in c && c.token).map(c => c.cardId),
        ]),
      ].sort();
  const indices = new Map(vocabulary.map((id, index) => [id, index + 1]));
  const width = vocabulary.length + 1; // Unknown identities retain numeric/hashed features.
  function addIdentity(vector: number[], id: string | undefined, amount = 1) {
    const index = id ? (indices.get(id) ?? 0) : 0;
    vector[index] = (vector[index] ?? 0) + amount;
  }
  function cardFeatures(card: VisibleCard | undefined, self: string): number[] {
    const id = card?.face?.cardId;
    const identity = Array<number>(width).fill(0);
    addIdentity(identity, id);
    const flags = Array<number>(16).fill(0);
    for (const note of [...(card?.face?.notes ?? []), ...(card?.face?.warnings ?? [])])
      semantic(flags, note);
    return [
      Number(!!card),
      Number(!!card?.face),
      Number(card?.controller === self),
      Number(card?.owner === self),
      Number(!!card?.exhausted),
      power(card) / 15,
      remaining(card) / 35,
      (card?.damage ?? 0) / 20,
      printedCost(id) / 12,
      Number(card?.face?.kind === 'base'),
      Number(card?.face?.kind === 'unit'),
      Number(card?.face?.kind === 'leader'),
      Number(card?.face?.kind === 'upgrade'),
      Number(!!card?.face?.sentinel),
      Number(!!card?.face?.leaderUnit),
      Number(!!card?.attachedTo),
      Number(!!card?.capturedBy),
      ...zones.map(zone => Number(card?.zone === zone)),
      ...identity,
      ...flags,
    ];
  }

  function encodeContext(
    view: GameView,
    self: string,
    deckIndex: number,
    memory: VisibleMemory,
    builder?: CommandBuilder,
  ): number[] {
    const cards = view.cards;
    const decision = view.decision;
    const counts: number[] = [];
    for (const own of [true, false]) {
      const side = cards.filter(c => (c.controller === self) === own);
      counts.push(remaining(side.find(c => c.face?.kind === 'base')) / 35);
      for (const zone of zones) {
        const group = side.filter(c => c.zone === zone);
        counts.push(
          group.length / 20,
          group.filter(c => !c.exhausted).length / 20,
          group.reduce((n, c) => n + power(c), 0) / 40,
          group.reduce((n, c) => n + remaining(c), 0) / 100,
        );
      }
    }
    const ownDeck = Array<number>(width).fill(0);
    const deck = roster[deckIndex]!.snapshot;
    for (const c of deck.mainboard) addIdentity(ownDeck, c.cardId, c.quantity / 3);
    addIdentity(ownDeck, deck.leader);
    addIdentity(ownDeck, deck.base);
    const groups = Array.from({ length: 14 }, () => Array<number>(width).fill(0));
    for (const c of cards) {
      if (!c.face) continue;
      const group = (c.controller === self ? 0 : 7) + zones.indexOf(c.zone);
      addIdentity(groups[group]!, c.face.cardId, 1 / 3);
    }
    const semantics = Array<number>(96).fill(0);
    for (const s of [decision?.kind, decision?.effect, decision?.source?.cardId, builder?.stage])
      semantic(semantics, s);
    for (const s of view.scheduled) {
      semantic(semantics, s.kind, 0.2);
      semantic(semantics, s.source.cardId, 0.2);
    }
    for (const id of builder?.selected ?? []) {
      const card = cards.find(c => c.id === id) ?? decision?.inspectedCards.find(c => c.id === id);
      semantic(semantics, card?.face?.cardId, 0.2);
    }
    for (const c of decision?.inspectedCards ?? [])
      semantic(semantics, `inspected:${c.face.cardId}`, 0.2);
    if (view.privateDeckTop) semantic(semantics, `top:${view.privateDeckTop.face.cardId}`, 0.2);
    return [
      Math.min(view.round, 100) / 20,
      Number(view.activePlayer === self),
      Number(view.initiative.holder === self),
      Number(view.initiative.claimed),
      ...['setup', 'action', 'regroup', 'ended'].map(p => Number(view.phase === p)),
      (view.players.find(p => p.id === self)?.deckCount ?? 0) / 60,
      (view.players.find(p => p.id !== self)?.deckCount ?? 0) / 60,
      (view.players.find(p => p.id === self)?.handCount ?? 0) / 20,
      (view.players.find(p => p.id !== self)?.handCount ?? 0) / 20,
      (builder?.selected.length ?? 0) / 20,
      (decision?.selection?.min ?? 0) / 20,
      (decision?.selection?.max ?? 0) / 20,
      (decision?.selection?.budget?.max ?? 0) / 20,
      (builder?.digits.length ?? 0) / 16,
      Number(builder?.digits || 0) / Number.MAX_SAFE_INTEGER,
      ...counts,
      ...ownDeck,
      ...groups.flat(),
      ...semantics,
      ...memory.values,
      ...(ownDeckRouting ? roster.map((_, index) => Number(index === deckIndex)) : []),
    ];
  }

  function encodeCandidate(builder: CommandBuilder, candidate: Candidate, self: string): number[] {
    const view = builder.view;
    const option = candidate.kind === 'option' ? candidate.option : builder.option;
    const ids = candidate.kind === 'select' ? [candidate.card] : (option?.cards ?? []);
    const find = (id: string | undefined) => {
      const card = view.cards.find(c => c.id === id);
      if (card) return card;
      const inspected = view.decision!.inspectedCards.find(c => c.id === id);
      return inspected
        ? {
            ...inspected,
            owner: self,
            controller: self,
            zone: 'hand' as const,
            exhausted: false,
            damage: 0,
            deployedAs: null,
            capturedBy: null,
            attachedTo: null,
            abilityUses: {},
            limitedActions: [],
          }
        : undefined;
    };
    const semantics = Array<number>(64).fill(0);
    for (const label of [
      candidate.kind,
      option?.kind,
      option?.mode,
      option?.action?.id,
      option?.ability?.id,
      option?.ability?.timing,
      option?.ability?.source.cardId,
      option?.tokenCardId,
      candidate.kind === 'name' ? candidate.cardId : undefined,
      find(ids[0])?.face?.cardId,
      find(ids[1])?.face?.cardId,
    ])
      semantic(semantics, label);
    return [
      ...['option', 'select', 'finish', 'name', 'digit'].map(k => Number(candidate.kind === k)),
      candidate.kind === 'digit' ? candidate.digit / 9 : 0,
      candidate.kind === 'select' ? candidate.quantity / 10 : 0,
      Number(option?.playerId === self),
      Number(!!option?.piloting),
      Number(!!option?.action?.deploymentAvailable),
      Number(!!option?.takeMulligan),
      (option?.plot?.cost ?? 0) / 10,
      Number(!!option?.plot?.useOtherResources),
      (option?.exploit?.maxUnits ?? 0) / 10,
      (option?.exploit?.costBeforeExploit ?? 0) / 10,
      (option?.smuggle?.cost ?? 0) / 10,
      ...cardFeatures(find(ids[0]), self),
      ...cardFeatures(find(ids[1]), self),
      ...semantics,
    ];
  }

  const encodingContract = {
    version: ownDeckRouting ? 2 : 1,
    vocabulary,
    contextSize: 18 + 58 + width * 15 + 96 + 96 + (ownDeckRouting ? roster.length : 0),
    ...(ownDeckRouting ? { ownDeckKeys: roster.map(d => d.key) } : {}),
    candidateSize: 16 + (24 + width + 16) * 2 + 64,
    memory: 'seat-visible-decayed-event-hash-96-v1',
    description:
      'Deck composition; visible zone identities/statistics; decision, partial selection, scheduled effects and bounded event memory. Candidate identities/statistics and semantic hashes. No hidden cards, handles, seed or absolute seat ID.',
  };

  return { vocabulary, encodeCandidate, encodeContext, encodingContract };
}

export const legacyEncoding = makeEncoding(roster);
export const leagueEncoding = makeEncoding(leagueRoster);
export const { vocabulary, encodeCandidate, encodeContext, encodingContract } = legacyEncoding;
