import type { GameView } from './types.ts';

const modules = [
  'privateDeckTop',
  'phase',
  'round',
  'activePlayer',
  'initiative',
  'result',
  'players',
  'scheduled',
  'decision',
] as const;
type Modules = Pick<GameView, (typeof modules)[number]>;
type CollectionDelta<T> = { upsert: T[]; remove: string[]; order?: string[] };
export type ViewDelta = {
  protocolVersion: GameView['protocolVersion'];
  gameId: string;
  epoch: string;
  fromRevision: number;
  revision: number;
  modules?: Partial<Modules>;
  cards?: CollectionDelta<GameView['cards'][number]>;
  events?: CollectionDelta<GameView['events'][number]>;
};
const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
function collection<T extends { id: string }>(
  before: T[],
  after: T[],
): CollectionDelta<T> | undefined {
  const old = new Map(before.map(item => [item.id, item]));
  const next = new Map(after.map(item => [item.id, item]));
  const remove = before.filter(item => !next.has(item.id)).map(item => item.id);
  const upsert = after.filter(item => !equal(old.get(item.id), item));
  const implicitOrder = [
    ...before.filter(item => next.has(item.id)).map(item => item.id),
    ...after.filter(item => !old.has(item.id)).map(item => item.id),
  ];
  const order = after.map(item => item.id);
  const reordered = !equal(implicitOrder, order);
  if (!remove.length && !upsert.length && !reordered) return undefined;
  return { remove, upsert, ...(reordered ? { order } : {}) };
}

/** Diff already-projected views only. The authority's revision, private IDs,
 * deck order and execution frames have no representation in this contract. */
export function diffViews(before: GameView, after: GameView): ViewDelta | null {
  if (
    before.gameId !== after.gameId ||
    before.epoch !== after.epoch ||
    before.protocolVersion !== after.protocolVersion ||
    after.revision < before.revision
  )
    throw new Error('Crossfire snapshot required');
  if (after.revision === before.revision) {
    if (!equal(before, after)) throw new Error('Crossfire revision reused');
    return null;
  }
  const changed: Record<string, unknown> = {};
  for (const key of modules) if (!equal(before[key], after[key])) changed[key] = after[key];
  const cards = collection(before.cards, after.cards);
  const events = collection(before.events, after.events);
  return structuredClone({
    protocolVersion: after.protocolVersion,
    gameId: after.gameId,
    epoch: after.epoch,
    fromRevision: before.revision,
    revision: after.revision,
    ...(Object.keys(changed).length ? { modules: changed } : {}),
    ...(cards ? { cards } : {}),
    ...(events ? { events } : {}),
  });
}

function applyCollection<T extends { id: string }>(before: T[], delta: CollectionDelta<T>): T[] {
  const entries = new Map(before.map(item => [item.id, item]));
  const removed = new Set(delta.remove),
    updated = new Set(delta.upsert.map(item => item.id));
  if (removed.size !== delta.remove.length || updated.size !== delta.upsert.length)
    throw new Error('Crossfire invalid collection delta');
  for (const id of removed) {
    if (!entries.delete(id) || updated.has(id)) throw new Error('Crossfire invalid removal');
  }
  for (const item of delta.upsert) entries.set(item.id, item);
  if (!delta.order) return [...entries.values()];
  if (new Set(delta.order).size !== entries.size || delta.order.length !== entries.size)
    throw new Error('Crossfire invalid collection order');
  return delta.order.map(id => {
    const item = entries.get(id);
    if (!item) throw new Error('Crossfire invalid collection order');
    return item;
  });
}

/** Apply a trusted server delta after parsing its envelope. Gaps/replacements
 * require a fresh snapshot; never try to guess the missing board operations. */
export function applyViewDelta(before: GameView, delta: ViewDelta): GameView {
  if (
    before.gameId !== delta.gameId ||
    before.epoch !== delta.epoch ||
    before.protocolVersion !== delta.protocolVersion ||
    before.revision !== delta.fromRevision ||
    !Number.isSafeInteger(delta.revision) ||
    delta.revision <= delta.fromRevision
  )
    throw new Error('Crossfire snapshot required');
  const next = structuredClone(before);
  if (delta.modules) {
    for (const key of modules) {
      if (Object.prototype.hasOwnProperty.call(delta.modules, key))
        Object.assign(next, { [key]: structuredClone(delta.modules[key]) });
    }
  }
  if (delta.cards) next.cards = structuredClone(applyCollection(before.cards, delta.cards));
  if (delta.events) next.events = structuredClone(applyCollection(before.events, delta.events));
  next.revision = delta.revision;
  return next;
}
