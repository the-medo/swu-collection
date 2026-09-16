import type { CardIdentityCatalog } from '../../../play/admission/decks.ts';

export type CrossfireCatalog = CardIdentityCatalog &
  Readonly<Record<string, { type: string; name?: string; subtitle?: string | null } | undefined>>;
export type CrossfireCatalogSource = CrossfireCatalog | (() => Promise<CrossfireCatalog>);

/** Static catalogs keep integration fixtures simple; production resolves the
 * preview-aware provider for each admission or browser read. */
export function resolveCrossfireCatalog(source: CrossfireCatalogSource) {
  return typeof source === 'function' ? source() : Promise.resolve(source);
}
