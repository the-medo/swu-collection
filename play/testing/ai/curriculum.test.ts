import { expect, test } from 'bun:test';
import {
  curriculumCases,
  curriculumManifest,
  curriculumRows,
} from '../../ai/practice/curriculum.ts';

test('all variations retain legal approved outcomes; whole held-out families stay separate', () => {
  const train = new Set(curriculumCases.filter(c => c.split === 'train').map(c => c.family));
  const heldout = new Set(curriculumCases.filter(c => c.split === 'heldout').map(c => c.family));
  expect([...heldout].sort()).toEqual(['galen-credit', 'too-late-to-sacrifice']);
  expect([...heldout].some(id => train.has(id))).toBe(false);
  expect(curriculumManifest.hash).toMatch(/^[a-f0-9]{64}$/);
  for (const c of curriculumCases) {
    const rows = curriculumRows(c.id);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every(r => r.label !== 'pass' && !r.label.startsWith('Regroup'))).toBe(true);
    expect(rows.every(r => r.acceptable.includes(r.action))).toBe(true);
    expect(c.line.label).not.toMatch(/Losing|Wasteful|comparison/);
  }
});
