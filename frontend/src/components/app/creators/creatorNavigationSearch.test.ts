import { expect, test } from 'bun:test';
import { creatorDirectorySearchSchema, creatorReturnToSchema } from './creatorNavigationSearch.ts';
import { creatorPageSearchSchema } from './creatorPageSearch.ts';
import { discoverySchema } from '../../../../../shared/creators/contracts.ts';

test('return destinations preserve public filters and nested directory context', () => {
  for (const path of [
    '/content?page=2&language=en&tags=medium%3Aarticle',
    '/creators?q=Resource%20Academy&page=2',
    '/creators/resource-academy/articles?language=fr&returnTo=%2Fcreators%3Fq%3DResource',
  ])
    expect(creatorReturnToSchema.parse(path)).toBe(path);
});

test('return destinations reject other origins, private routes and malformed values', () => {
  for (const value of [
    'https://example.com/',
    '//example.com/content',
    '/\\example.com/content',
    '/content/../../admin',
    '/creator-studio',
    '/creators/resource-academy/claim',
    '/content/123',
    '/creators/%2e%2e/admin',
    '/content\n',
    '/creators?q=' + 'x'.repeat(4000),
    {},
    ['content'],
    null,
  ])
    expect(creatorReturnToSchema.parse(value)).toBeUndefined();
});

test('directory URLs retain query text and recover from invalid filters', () => {
  expect(
    creatorDirectorySearchSchema.parse({ q: 'Resource ', page: '2', language: 'en' }),
  ).toMatchObject({ q: 'Resource ', page: 2, language: 'en' });
  expect(
    creatorDirectorySearchSchema.parse({ page: -1, q: {}, language: 'invalid language!' }),
  ).toMatchObject({ page: 1, q: undefined, language: undefined });
});

test('regional language links select the whole language throughout creator browsing', () => {
  for (const schema of [creatorDirectorySearchSchema, creatorPageSearchSchema, discoverySchema]) {
    expect(schema.parse({ language: 'en-CA' }).language).toBe('en');
    expect(schema.parse({ language: 'es-MX' }).language).toBe('es');
    expect(schema.parse({ language: 'pt-BR' }).language).toBe('pt');
  }
});
