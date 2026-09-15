import { z } from 'zod';
import baselineContract from './contracts/1.0.json';
import { CardCatalog, type CatalogData, checksum } from './catalog.ts';
import { parseVersion, supportsEngine } from '../engine/release.ts';

type Node = {
  literal?: unknown;
  type?: string;
  union?: number[];
  array?: number;
  tuple?: number[];
  properties?: Record<string, number>;
  required?: string[];
  additional?: number | false;
};
const contracts: Readonly<Record<string, { root: number; nodes: Node[] }>> = {
  '1.0': baselineContract as { root: number; nodes: Node[] },
};
function matches(value: unknown, index: number, nodes: Node[], depth = 0): boolean {
  if (depth > 64) return false;
  const node = nodes[index]!;
  if ('literal' in node) return value === node.literal;
  if (node.type)
    return (
      typeof value === node.type &&
      (node.type !== 'number' ||
        (Number.isSafeInteger(value) && Math.abs(value as number) <= 1_000_000_000))
    );
  if (node.union) return node.union.some(i => matches(value, i, nodes, depth + 1));
  if (node.array !== undefined)
    return (
      Array.isArray(value) &&
      value.length <= 25_000 &&
      value.every(v => matches(v, node.array!, nodes, depth + 1))
    );
  if (node.tuple)
    return (
      Array.isArray(value) &&
      value.length === node.tuple.length &&
      value.every((v, i) => matches(v, node.tuple![i]!, nodes, depth + 1))
    );
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const object = value as Record<string, unknown>;
  if (node.required!.some(k => !Object.hasOwn(object, k))) return false;
  return Object.keys(object).every(k => {
    if (['__proto__', 'prototype', 'constructor'].includes(k)) return false;
    const child = Object.hasOwn(node.properties!, k) ? node.properties![k] : node.additional;
    return typeof child === 'number' && matches(object[k], child, nodes, depth + 1);
  });
}
const semver = z
  .string()
  .max(40)
  .refine(v => {
    try {
      parseVersion(v);
      return true;
    } catch {
      return false;
    }
  }, 'Invalid release version');
const envelope = z.strictObject({
  schema: z.literal(1),
  version: semver,
  requiredEngine: semver,
  cards: z.array(z.unknown()).min(1).max(25_000),
  titles: z.record(z.string().min(1).max(120), z.string().min(1).max(512)),
});
/** Downloaded input is data only. Unknown fields and effects are rejected against
 * the complete generated authoring contract, including deeply nested abilities. */
export function validateCatalog(raw: unknown, expectedHash?: string): CardCatalog {
  if (Buffer.byteLength(JSON.stringify(raw)) > 8_000_000)
    throw new Error('Card bundle is too large');
  const parsed = envelope.parse(raw);
  const [major, minor] = parseVersion(parsed.version),
    [requiredMajor, requiredMinor] = parseVersion(parsed.requiredEngine);
  if (major !== requiredMajor || minor !== requiredMinor)
    throw new Error('Card release and required engine feature line disagree');
  if (!supportsEngine(parsed.requiredEngine))
    throw new Error('Card bundle requires a newer or different major engine');
  const contract = contracts[`${requiredMajor}.${requiredMinor}`];
  if (!contract) throw new Error('Unsupported card data contract');
  for (const card of parsed.cards)
    if (!matches(card, contract.root, contract.nodes))
      throw new Error(
        `Invalid card definition: ${typeof card === 'object' && card && 'cardId' in card ? String(card.cardId).slice(0, 120) : 'unknown'}`,
      );
  const data = parsed as CatalogData;
  for (const card of data.cards) {
    if (!/^[a-z0-9_-]{1,120}$/.test(card.cardId) || !card.name.trim())
      throw new Error('Invalid card identity');
    if (!Object.hasOwn(data.titles, card.cardId))
      throw new Error(`Card title missing: ${card.cardId}`);
    if (('cost' in card && card.cost < 0) || ('hp' in card && card.hp < 1))
      throw new Error(`Invalid card statistics: ${card.cardId}`);
  }
  const catalog = new CardCatalog(data);
  if (expectedHash !== undefined && catalog.hash !== expectedHash)
    throw new Error('Card bundle checksum mismatch');
  return catalog;
}
export { checksum };
