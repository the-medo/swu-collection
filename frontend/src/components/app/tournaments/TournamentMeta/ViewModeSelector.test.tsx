import { describe, expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import ViewModeSelector from './ViewModeSelector.tsx';

describe('Meta view modes', () => {
  test('personal and team statistics keep their chart/table choices', () => {
    const html = renderToStaticMarkup(<ViewModeSelector value="chart" onChange={() => {}} />);
    expect(html).toContain('Chart');
    expect(html).toContain('Table');
    expect(html).not.toContain('APR');
  });

  test('tournament analysis can opt into APR', () => {
    const html = renderToStaticMarkup(<ViewModeSelector value="apr" onChange={() => {}} showApr />);
    expect(html).toContain('APR — Adjusted performance rate');
    expect(html).toContain('data-state="on"');
  });
});
