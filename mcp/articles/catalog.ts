import {
  createIndependentCardCatalog,
  type CardCatalogReader,
} from '../../server/lib/cards/cardListProvider.ts';
import type { Database } from '../../server/lib/creators/types.ts';

// One cache per runtime client; transaction-scoped services receive this same
// reader explicitly so neither a new cache nor the main DB pool is created.
const catalogs = new WeakMap<Database, CardCatalogReader>();
export function articleCatalog(database: Database): CardCatalogReader {
  let catalog = catalogs.get(database);
  if (!catalog) {
    catalog = createIndependentCardCatalog(database);
    catalogs.set(database, catalog);
  }
  return catalog;
}
