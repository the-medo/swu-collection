import { isIP } from 'node:net';
import { lookup } from 'node:dns/promises';
import { z } from 'zod';
import { setInfo } from '../../../lib/swu-resources/set-info.ts';
import { transformToId } from '../../../lib/swu-resources/lib/transformToId.ts';
import { SwuSet } from '../../../types/enums.ts';
import {
  createPreviewCardPayloadTemplate,
  normalizePreviewCardPayload,
  type PreviewCardPayload,
} from './previewCardPayload.ts';

const MAX_JSON_BYTES = 2 * 1024 * 1024;
export const MAX_REMOTE_IMAGE_BYTES = 8 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 10_000;
const transformNames = ['lowercase', 'uppercase', 'integer', 'stripPairedTags', 'cardId'] as const;

const zExpression = z
  .object({
    $source: z.string().min(1).optional(),
    $variable: z.string().min(1).optional(),
    $template: z.string().optional(),
    $value: z.unknown().optional(),
    $map: z.string().min(1).optional(),
    $array: z.boolean().optional(),
    $transforms: z.array(z.enum(transformNames)).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    const selectors = ['$source', '$variable', '$template', '$value'].filter(
      key => value[key as keyof typeof value] !== undefined,
    );
    if (selectors.length !== 1) {
      ctx.addIssue({ code: 'custom', message: 'An expression needs exactly one value selector' });
    }
  });

const zImageDefinition = z.object({
  source: z.string().min(1),
  urlTemplate: z.string().url(),
});

export const zPreviewCardImportDefinition = z.object({
  sourceUrlTemplate: z.string().url(),
  request: z.object({
    url: z.string().url(),
    method: z.enum(['GET', 'POST']).default('POST'),
    headers: z.record(z.string(), z.string()).default({}),
    body: z.unknown().optional(),
  }),
  mappings: z.record(z.string(), z.record(z.string(), z.string())).default({}),
  template: z.record(z.string(), z.unknown()),
  images: z
    .object({
      front: zImageDefinition,
      back: zImageDefinition.optional(),
    })
    .optional(),
});

export type PreviewCardImportDefinition = z.infer<typeof zPreviewCardImportDefinition>;
export type RemoteImageInput = { side: 'front' | 'back'; url: string };

export class PreviewCardImportError extends Error {}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function extractSourceVariables(
  template: string,
  sourceUrl: string,
): Record<string, string> {
  const names: string[] = [];
  const pattern = escapeRegex(template).replace(/\\\{([A-Za-z][A-Za-z0-9_]*)\\\}/g, (_, name) => {
    names.push(name);
    return '([^/?#]+)';
  });
  const match = new RegExp(`^${pattern}$`).exec(sourceUrl);
  if (!match) throw new PreviewCardImportError('Source URL does not match the definition template');
  return Object.fromEntries(
    names.map((name, index) => [name, decodeURIComponent(match[index + 1]!)]),
  );
}

function getPath(value: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((current, segment) => {
    if (!current || typeof current !== 'object') return undefined;
    return (current as Record<string, unknown>)[segment];
  }, value);
}

function interpolate(template: string, context: Record<string, unknown>): string {
  return template.replace(/\{([A-Za-z][A-Za-z0-9_.]*)\}/g, (_, path: string) => {
    const value = getPath(context, path);
    if (value === undefined || value === null) {
      throw new PreviewCardImportError(`Missing interpolation value: ${path}`);
    }
    return String(value);
  });
}

export function stripPairedFormattingTags(value: string): string {
  let result = value;
  const pairedTag = /\{([A-Za-z][A-Za-z0-9-]*)\}([\s\S]*?)\{\/\1\}/g;
  while (pairedTag.test(result)) result = result.replace(pairedTag, '$2');
  return result;
}

export function createKarabastInternalCardId(title: string, subtitle?: string): string {
  const name = subtitle ? `${title}#${subtitle}` : title;
  const internalName = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\w\s#]|_/g, '')
    .replace(/\s/g, '-');

  return internalName ? `${internalName}-id` : '';
}

function applyTransform(value: unknown, transform: (typeof transformNames)[number]): unknown {
  if (value === null) return null;
  if (transform === 'lowercase') return String(value).toLowerCase();
  if (transform === 'uppercase') return String(value).toUpperCase();
  if (transform === 'integer') {
    const parsed = Number.parseInt(String(value), 10);
    if (!Number.isFinite(parsed))
      throw new PreviewCardImportError(`Cannot convert ${value} to integer`);
    return parsed;
  }
  if (transform === 'stripPairedTags') return stripPairedFormattingTags(String(value));
  return transformToId(String(value)).replace(/^-+|-+$/g, '');
}

function isEmptyArrayValue(value: unknown): boolean {
  return value === null || value === undefined || (typeof value === 'string' && !value.trim());
}

function evaluateExpression(
  expression: z.infer<typeof zExpression>,
  response: unknown,
  variables: Record<string, string>,
  context: Record<string, unknown>,
  mappings: PreviewCardImportDefinition['mappings'],
): unknown {
  let value: unknown;
  if (expression.$source !== undefined) value = getPath(response, expression.$source);
  else if (expression.$variable !== undefined) value = variables[expression.$variable];
  else if (expression.$template !== undefined) value = interpolate(expression.$template, context);
  else value = expression.$value;

  if (value === undefined)
    throw new PreviewCardImportError('Definition references a missing value');
  if (expression.$map) {
    const mapping = mappings[expression.$map];
    if (!mapping) throw new PreviewCardImportError(`Unknown mapping: ${expression.$map}`);
    const mapValue = (entry: unknown) => {
      const mapped = mapping[String(entry)];
      if (mapped === undefined)
        throw new PreviewCardImportError(`No ${expression.$map} mapping for ${entry}`);
      return mapped;
    };
    value = Array.isArray(value) ? value.map(mapValue).filter(Boolean) : mapValue(value);
  }
  for (const transform of expression.$transforms ?? []) value = applyTransform(value, transform);
  if (expression.$array) {
    const values = Array.isArray(value) ? value : [value];
    value = values.filter(entry => !isEmptyArrayValue(entry));
  }
  return value;
}

function renderValue(
  input: unknown,
  response: unknown,
  variables: Record<string, string>,
  context: Record<string, unknown>,
  mappings: PreviewCardImportDefinition['mappings'],
): unknown {
  const expression = zExpression.safeParse(input);
  if (expression.success) {
    return evaluateExpression(expression.data, response, variables, context, mappings);
  }
  if (Array.isArray(input))
    return input.map(value => renderValue(value, response, variables, context, mappings));
  if (!input || typeof input !== 'object') return input;
  if (Object.keys(input).some(key => key.startsWith('$'))) {
    return evaluateExpression(zExpression.parse(input), response, variables, context, mappings);
  }
  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => [
      interpolate(key, context),
      renderValue(value, response, variables, context, mappings),
    ]),
  );
}

export function buildImportedPreviewCard(
  definition: PreviewCardImportDefinition,
  sourceUrl: string,
  response: unknown,
): { payload: PreviewCardPayload; images: RemoteImageInput[] } {
  const variables = extractSourceVariables(definition.sourceUrlTemplate, sourceUrl);
  const context: Record<string, unknown> = {
    ...(response as Record<string, unknown>),
    ...variables,
  };
  const cardIdExpression = definition.template.cardId;
  if (!cardIdExpression)
    throw new PreviewCardImportError('Definition template must provide cardId');
  context.cardId = renderValue(cardIdExpression, response, variables, context, definition.mappings);
  const rendered = renderValue(
    definition.template,
    response,
    variables,
    context,
    definition.mappings,
  ) as Record<string, unknown>;
  if (typeof rendered.subtitle === 'string' && !rendered.subtitle.trim()) {
    rendered.subtitle = undefined;
    if (
      typeof rendered.title === 'string' &&
      typeof rendered.name === 'string' &&
      rendered.name.trim() === `${rendered.title.trim()},`
    ) {
      rendered.name = rendered.title;
    }
  }
  const renderedVariants = rendered.variants as Record<string, Record<string, unknown>> | undefined;
  Object.entries(renderedVariants ?? {}).forEach(([variantId, variant]) => {
    const set = z.enum(SwuSet).parse(variant.set);
    variant.fullSetName = setInfo[set].name;
    variant.image ??= { front: `preview/${variantId}-pending.webp`, back: null };
  });
  const payload = normalizePreviewCardPayload({
    ...createPreviewCardPayloadTemplate(),
    ...rendered,
  });
  const variants = Object.values(payload.variants).filter(Boolean);
  if (variants.length !== 1) {
    throw new PreviewCardImportError('External imports must produce exactly one card variant');
  }
  const variant = variants[0]!;
  if (!payload.karabast_id?.trim() && variant.cardNo > 0) {
    payload.karabast_id = `${variant.set.toUpperCase()}_${variant.cardNo.toString().padStart(3, '0')}`;
  }
  if (!payload.karabast_id_to_swubase_id?.trim()) {
    payload.karabast_id_to_swubase_id = createKarabastInternalCardId(
      payload.title,
      payload.subtitle,
    );
  }

  const images = definition.images
    ? (['front', 'back'] as const).flatMap(side => {
        const image = definition.images?.[side];
        if (!image) return [];
        const path = getPath(response, image.source);
        if (!path) return [];
        return [{ side, url: interpolate(image.urlTemplate, { ...context, path }) }];
      })
    : [];
  if (definition.images && !images.some(image => image.side === 'front')) {
    throw new PreviewCardImportError('The remote response has no front image path');
  }
  return { payload, images };
}

function isPrivateAddress(address: string): boolean {
  const normalized = address.toLowerCase();
  if (normalized.startsWith('::ffff:')) return true;
  if (
    normalized === '::1' ||
    normalized === '::' ||
    normalized.startsWith('fe80:') ||
    normalized.startsWith('ff') ||
    normalized.startsWith('2001:db8:')
  )
    return true;
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
  const parts = normalized.split('.').map(Number);
  if (parts.length !== 4 || parts.some(Number.isNaN)) return false;
  return (
    parts[0] === 0 ||
    parts[0] === 10 ||
    parts[0] === 127 ||
    (parts[0] === 100 && parts[1]! >= 64 && parts[1]! <= 127) ||
    (parts[0] === 169 && parts[1] === 254) ||
    (parts[0] === 172 && parts[1]! >= 16 && parts[1]! <= 31) ||
    (parts[0] === 192 && parts[1] === 0 && parts[2] === 0) ||
    (parts[0] === 192 && parts[1] === 0 && parts[2] === 2) ||
    (parts[0] === 192 && parts[1] === 168) ||
    (parts[0] === 198 && (parts[1] === 18 || parts[1] === 19)) ||
    (parts[0] === 198 && parts[1] === 51 && parts[2] === 100) ||
    (parts[0] === 203 && parts[1] === 0 && parts[2] === 113) ||
    parts[0]! >= 224
  );
}

export async function assertSafeRemoteUrl(value: string): Promise<URL> {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password) {
    throw new PreviewCardImportError('Remote URLs must use HTTPS without embedded credentials');
  }
  const hostname = url.hostname.replace(/^\[|\]$/g, '');
  if (hostname === 'localhost')
    throw new PreviewCardImportError('Private remote hosts are not allowed');
  const addresses = isIP(hostname)
    ? [{ address: hostname }]
    : await lookup(hostname, { all: true });
  if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new PreviewCardImportError('Private remote hosts are not allowed');
  }
  return url;
}

export async function fetchRemote(
  value: string,
  init: RequestInit,
  maxBytes: number,
  redirects = 3,
): Promise<{ bytes: Uint8Array; contentType: string }> {
  const url = await assertSafeRemoteUrl(value);
  const response = await fetch(url, {
    ...init,
    redirect: 'manual',
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if ([301, 302, 303, 307, 308].includes(response.status)) {
    if (redirects === 0) throw new PreviewCardImportError('Too many remote redirects');
    const location = response.headers.get('location');
    if (!location) throw new PreviewCardImportError('Remote redirect has no location');
    return fetchRemote(new URL(location, url).toString(), init, maxBytes, redirects - 1);
  }
  if (!response.ok)
    throw new PreviewCardImportError(`Remote request failed with status ${response.status}`);
  const declaredSize = Number(response.headers.get('content-length') ?? 0);
  if (declaredSize > maxBytes) throw new PreviewCardImportError('Remote response is too large');
  if (!response.body) throw new PreviewCardImportError('Remote response has no body');
  const chunks: Uint8Array[] = [];
  let receivedBytes = 0;
  const reader = response.body.getReader();
  while (true) {
    const { done, value: chunk } = await reader.read();
    if (done) break;
    receivedBytes += chunk.byteLength;
    if (receivedBytes > maxBytes) {
      await reader.cancel();
      throw new PreviewCardImportError('Remote response is too large');
    }
    chunks.push(chunk);
  }
  const bytes = new Uint8Array(receivedBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { bytes, contentType: response.headers.get('content-type')?.split(';')[0] ?? '' };
}

export async function fetchImportResponse(
  definition: PreviewCardImportDefinition,
  sourceUrl: string,
): Promise<unknown> {
  const variables = extractSourceVariables(definition.sourceUrlTemplate, sourceUrl);
  const body = definition.request.body
    ? renderValue(definition.request.body, {}, variables, variables, {})
    : undefined;
  const headers = Object.fromEntries(
    Object.entries(definition.request.headers).map(([key, value]) => [
      key,
      interpolate(value, variables),
    ]),
  );
  const { bytes, contentType } = await fetchRemote(
    interpolate(definition.request.url, variables),
    {
      method: definition.request.method,
      headers: { 'content-type': 'application/json', ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    },
    MAX_JSON_BYTES,
  );
  if (contentType !== 'application/json')
    throw new PreviewCardImportError('Remote API did not return JSON');
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new PreviewCardImportError('Remote API returned invalid JSON');
  }
}
