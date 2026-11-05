import { describe, expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import ViewModeSelector from './ViewModeSelector.tsx';

describe('Meta view modes', () => {
  test('personal and team statistics keep their chart/table choices', () => {
    const html = renderToStaticMarkup(<ViewModeSelector value="chart" onChange={() => {}} />);
    expect(html).toContain('Chart');
    expect(html).toContain('Table');
    expect(html).not.toContain('APR');
    expect(html).not.toContain('Plot');
  });

  test('tournament analysis includes the meta map', () => {
    const html = renderToStaticMarkup(<ViewModeSelector value="map" onChange={() => {}} showApr />);
    expect(html).toContain('Plot — Win rate and meta share');
    expect(html).toContain('data-state="on"');
  });

  test('tournament analysis can opt into APR', () => {
    const html = renderToStaticMarkup(<ViewModeSelector value="apr" onChange={() => {}} showApr />);
    expect(html).toContain('APR — Adjusted performance rate');
    expect(html).toContain('data-state="on"');
  });
});
