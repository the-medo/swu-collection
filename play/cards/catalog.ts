import { createHash } from 'node:crypto';
import type { CardDefinition } from './definition.ts';
import { supportedCards } from './registry.ts';
import titles from './catalog-names.json';
import release from './release.json';
import { ENGINE_VERSION, supportsEngine } from '../engine/release.ts';

export type CatalogData = {
  schema: 1;
  version: string;
  requiredEngine: string;
  cards: readonly CardDefinition[];
  titles: Readonly<Record<string, string>>;
};
export function canonicalJson(value: unknown): string {
  const canonical = (v: any): any =>
    Array.isArray(v)
      ? v.map(canonical)
      : v && typeof v === 'object'
        ? Object.fromEntries(
            Object.keys(v)
              .sort()
              .map(k => [k, canonical(v[k])]),
          )
        : v;
  return JSON.stringify(canonical(value));
}
export function checksum(value: unknown): string {
  return createHash('sha256').update(canonicalJson(value)).digest('hex');
}
function freeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}
export class CardCatalog {
  readonly data: CatalogData;
  readonly hash: string;
  readonly pin: string;
  readonly #cards: Map<string, CardDefinition>;
  readonly #titles: Set<string>;
  constructor(data: CatalogData) {
    this.data = freeze(structuredClone(data));
    this.hash = checksum(this.data);
    this.pin = `${data.version}@${this.hash}`;
    this.#cards = new Map(this.data.cards.map(c => [c.cardId, c]));
    if (this.#cards.size !== data.cards.length)
      throw new Error('Duplicate Crossfire card definition');
    this.#titles = new Set(Object.values(this.data.titles));
    Object.freeze(this);
  }
  find(id: string) {
    return this.#cards.get(id);
  }
  definition(id: string) {
    const card = this.find(id);
    if (!card) throw new Error(`Unsupported Crossfire card: ${id}`);
    return card;
  }
  title(id: string) {
    return Object.hasOwn(this.data.titles, id) ? this.data.titles[id] : undefined;
  }
  hasTitle(title: string) {
    return this.#titles.has(title);
  }
}
export const bundledCatalog = new CardCatalog({
  schema: 1,
  ...release,
  cards: supportedCards,
  titles,
});
export const DEVELOPMENT_BASELINE_PIN =
  '1.0.0@67e5bbc0f6f9a98c4627628324c6700868425fc99887fc5120bf4778cd6a4a50';
const catalogs = new Map<string, CardCatalog>([[bundledCatalog.pin, bundledCatalog]]);
if (bundledCatalog.pin === DEVELOPMENT_BASELINE_PIN)
  catalogs.set('crossfire-core-125', bundledCatalog);
export function registerCatalog(catalog: CardCatalog): CardCatalog {
  if (!supportsEngine(catalog.data.requiredEngine))
    throw new Error('Card bundle requires a different engine');
  for (const installed of catalogs.values())
    if (installed.data.version === catalog.data.version && installed.hash !== catalog.hash)
      throw new Error('Card bundle version already has different contents');
  catalogs.set(catalog.pin, catalog);
  if (catalog.pin === DEVELOPMENT_BASELINE_PIN) catalogs.set('crossfire-core-125', catalog);
  return catalog;
}
export type CatalogContext = { versions: { cards: string } };
export function catalogFor(context: CatalogContext): CardCatalog {
  const catalog = catalogs.get(context.versions.cards);
  if (!catalog) throw new Error('Crossfire card bundle is not installed');
  return catalog;
}
export function cardDefinition(context: CatalogContext, id: string): CardDefinition {
  return catalogFor(context).definition(id);
}
export function cardTitle(context: CatalogContext, id: string) {
  return catalogFor(context).title(id);
}
export const baselineVersions = Object.freeze({
  state: 109,
  engine: ENGINE_VERSION,
  cards: bundledCatalog.pin,
  rules: 'swu-8.0',
  format: 'core-practice',
});
export function versionsFor(catalog: CardCatalog) {
  return { ...baselineVersions, cards: catalog.pin };
}
export function compatibleVersions(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const v = value as {
    state: number;
    engine: string;
    cards: string;
    rules: string;
    format: string;
  };
  const legacy = v.engine === 'crossfire-0.129.0' && v.cards === 'crossfire-core-125';
  return (
    v.state === 109 &&
    v.rules === baselineVersions.rules &&
    v.format === baselineVersions.format &&
    (legacy || supportsEngine(v.engine)) &&
    catalogs.has(v.cards)
  );
}
export function assertCompatibleVersions(value: unknown): void {
  if (!compatibleVersions(value)) throw new Error('Incompatible Crossfire engine or card bundle');
}
