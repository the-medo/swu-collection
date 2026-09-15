import { supportsEngine } from '../engine/release.ts';
import type { Sql, TransactionSql } from 'postgres';
import {
  bundledCatalog,
  catalogFor,
  registerCatalog,
  compatibleVersions,
  versionsFor,
  DEVELOPMENT_BASELINE_PIN,
  type CardCatalog,
} from '../cards/catalog.ts';
import { validateCatalog } from '../cards/validate.ts';
import { bundleVersionsSchema, type BundleVersions } from '../cards/version-contract.ts';

export const ACTIVE_CARD_BUNDLE = 'crossfire_card_bundle_version';
export const CARD_BUNDLE_CHANNEL = 'crossfire_card_bundles';
type Database = Sql | TransactionSql;
export class CardBundleError extends Error {}
const initialization = new WeakMap<Sql, Promise<void>>();

export async function installCardBundle(
  sql: Database,
  catalog: CardCatalog,
  sourceCommit: string,
  r2Key: string | null = null,
) {
  const validated = validateCatalog(catalog.data, catalog.hash);
  await sql`INSERT INTO play.card_bundles(version, checksum, required_engine, r2_key, definitions, source_commit)
    VALUES (${validated.data.version}, ${validated.hash}, ${validated.data.requiredEngine}, ${r2Key}, ${sql.json(validated.data as never)}, ${sourceCommit})
    ON CONFLICT (version) DO NOTHING`;
  const [row] =
    await sql`SELECT checksum FROM play.card_bundles WHERE version = ${validated.data.version}`;
  if (row?.checksum !== validated.hash)
    throw new CardBundleError('This version already contains different card definitions');
  return validated;
}
export function initializeCardBundles(sql: Sql): Promise<void> {
  let pending = initialization.get(sql);
  if (!pending) {
    pending = sql
      .begin(async tx => {
        await installCardBundle(
          tx,
          bundledCatalog,
          `bundled-engine-${bundledCatalog.data.requiredEngine}`,
        );
        await tx`INSERT INTO public.application_configuration(key, value) VALUES (${ACTIVE_CARD_BUNDLE}, ${bundledCatalog.data.version}) ON CONFLICT (key) DO NOTHING`;
      })
      .then(() => undefined)
      .catch(error => {
        initialization.delete(sql);
        throw error;
      });
    initialization.set(sql, pending);
  }
  return pending;
}
export async function loadCardBundle(sql: Database, requested: string): Promise<CardCatalog> {
  const pin = requested === 'crossfire-core-125' ? DEVELOPMENT_BASELINE_PIN : requested;
  try {
    return catalogFor({ versions: { cards: pin } });
  } catch {
    /* durable lookup below */
  }
  const separator = pin.indexOf('@');
  if (separator < 1) throw new CardBundleError('Unknown card bundle');
  const version = pin.slice(0, separator),
    hash = pin.slice(separator + 1);
  const [row] =
    await sql`SELECT definitions, checksum, required_engine FROM play.card_bundles WHERE version = ${version} AND checksum = ${hash}`;
  if (!row) throw new CardBundleError('Card bundle is not installed');
  if (!supportsEngine(row.required_engine))
    throw new CardBundleError('Card bundle requires a newer or different major engine');
  const catalog = validateCatalog(row.definitions, row.checksum);
  if (catalog.pin !== pin || catalog.data.requiredEngine !== row.required_engine)
    throw new CardBundleError('Stored card bundle metadata does not match');
  return registerCatalog(catalog);
}
export async function loadGameVersions(sql: Database, raw: unknown): Promise<boolean> {
  const parsed = bundleVersionsSchema.safeParse(raw);
  if (!parsed.success) return false;
  if (
    !supportsEngine(parsed.data.engine) &&
    !(parsed.data.engine === 'crossfire-0.129.0' && parsed.data.cards === 'crossfire-core-125')
  )
    return false;
  try {
    await loadCardBundle(sql, parsed.data.cards);
  } catch (error) {
    if (error instanceof CardBundleError) return false;
    throw error;
  }
  return compatibleVersions(parsed.data);
}
export async function activeCardVersions(sql: Database): Promise<BundleVersions> {
  const [row] = await sql`SELECT b.version, b.checksum FROM public.application_configuration c
    JOIN play.card_bundles b ON b.version = c.value WHERE c.key = ${ACTIVE_CARD_BUNDLE}`;
  if (!row) throw new CardBundleError('No active card bundle is installed');
  return versionsFor(await loadCardBundle(sql, `${row.version}@${row.checksum}`));
}
export async function activateCardBundle(
  sql: Sql,
  catalog: CardCatalog,
  sourceCommit: string,
  r2Key: string | null,
  expectedActive: string,
) {
  // Validate before opening the transaction; only complete data changes the pointer.
  registerCatalog(validateCatalog(catalog.data, catalog.hash));
  await sql.begin(async tx => {
    const [current] =
      await tx`SELECT value FROM public.application_configuration WHERE key = ${ACTIVE_CARD_BUNDLE} FOR UPDATE`;
    if (current?.value !== expectedActive)
      throw new CardBundleError('The active release changed; refresh before activating');
    await installCardBundle(tx, catalog, sourceCommit, r2Key);
    await tx`UPDATE public.application_configuration SET value = ${catalog.data.version} WHERE key = ${ACTIVE_CARD_BUNDLE}`;
    // PostgreSQL delivers this only after commit. Missed notifications are harmless:
    // admission reads the durable pointer and recovery loads its exact pinned catalog.
    await tx`SELECT pg_notify(${CARD_BUNDLE_CHANNEL}, ${catalog.pin})`;
  });
  registerCatalog(catalog);
}
export async function listenForCardBundles(sql: Sql, onError: (error: unknown) => void) {
  await initializeCardBundles(sql);
  const subscription = await sql.listen(CARD_BUNDLE_CHANNEL, pin => {
    void loadCardBundle(sql, pin).catch(onError);
  });
  return () => subscription.unlisten();
}
