import { expect, test } from 'bun:test';
import { createCreatorTemplatesRoute } from './creator-templates.ts';
import { summarizeTemplateMeta } from '../lib/creators/templateMetaSummary.ts';
import type { TemplateMetaInput } from '../lib/creators/articleTemplateData.ts';

test('template endpoint validates selectors before querying and coerces a format correctly', async () => {
  const calls: TemplateMetaInput[] = [];
  const app = createCreatorTemplatesRoute(async input => {
    calls.push(input);
    return summarizeTemplateMeta({ scope: 'current', id: '1', name: 'Meta' }, [], [], '2026-10-15');
  });
  for (const query of [
    '',
    'scope=current',
    'scope=current&format=-1',
    'scope=current&format=1.5',
    'scope=tournament&id=bad',
    'scope=group',
    'scope=other',
  ]) {
    expect((await app.request(`/meta?${query}`)).status).toBe(400);
  }
  expect(calls).toHaveLength(0);
  expect((await app.request('/meta?scope=current&format=1')).status).toBe(200);
  const id = crypto.randomUUID();
  expect((await app.request(`/meta?scope=group&id=${id}`)).status).toBe(200);
  expect(calls).toEqual([
    { scope: 'current', format: 1 },
    { scope: 'group', id },
  ]);
});
