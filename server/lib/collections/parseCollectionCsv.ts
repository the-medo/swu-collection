import { collectionImportMaxRows } from '../../../types/CollectionImport.ts';

export class CollectionCsvError extends Error {}

export type CollectionCsvRow = {
  rowNumber: number;
  values: string[];
  raw: string;
  error?: string;
};

/** CSV records, including quoted commas/newlines, with physical source line numbers. */
export function parseCollectionCsv(csv: string) {
  const text = csv.replace(/^\uFEFF/, '');
  const records: CollectionCsvRow[] = [];
  let values: string[] = [];
  let value = '';
  let quoted = false;
  let closedQuote = false;
  let error: string | undefined;
  let line = 1;
  let startLine = 1;
  let start = 0;

  const finish = (end: number, next: number) => {
    values.push(value);
    if (values.length > 100)
      throw new CollectionCsvError('CSV files may contain at most 100 columns.');
    const raw = text.slice(start, end);
    if (raw.trim()) records.push({ rowNumber: startLine, values, raw, error });
    if (records.length > collectionImportMaxRows + 1) {
      throw new CollectionCsvError(
        `Import at most ${collectionImportMaxRows.toLocaleString()} rows at a time.`,
      );
    }
    values = [];
    value = '';
    closedQuote = false;
    error = undefined;
    start = next;
    startLine = line;
  };

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          value += '"';
          i++;
        } else {
          quoted = false;
          closedQuote = true;
        }
      } else {
        value += char;
        if (char === '\n' || (char === '\r' && text[i + 1] !== '\n')) line++;
      }
    } else if (char === ',') {
      values.push(value);
      value = '';
      closedQuote = false;
    } else if (char === '\n' || char === '\r') {
      const end = i;
      if (char === '\r' && text[i + 1] === '\n') i++;
      line++;
      finish(end, i + 1);
    } else if (char === '"' && value === '' && !closedQuote) {
      quoted = true;
    } else {
      if (closedQuote || char === '"') error = 'Invalid CSV quoting.';
      value += char;
    }
    if (values.length > 100)
      throw new CollectionCsvError('CSV files may contain at most 100 columns.');
  }
  if (quoted) error = 'Unclosed quoted CSV field.';
  finish(text.length, text.length);

  const first = records[0];
  if (!first) throw new CollectionCsvError('The CSV is empty.');
  const required = ['set', 'cardnumber', 'count', 'isfoil'];
  const normalized = first.values.map(v => v.trim().toLowerCase());
  const hasHeader = required.every(name => normalized.includes(name));
  if (hasHeader && (first.error || new Set(normalized).size !== normalized.length)) {
    throw new CollectionCsvError('The CSV header contains duplicate names or invalid quoting.');
  }
  const headers = hasHeader
    ? first.values
    : ['Set', 'CardNumber', 'Count', 'IsFoil', 'Stamp'].slice(0, Math.max(4, first.values.length));
  const rows = hasHeader ? records.slice(1) : records;
  if (!rows.length) throw new CollectionCsvError('The CSV contains no card rows.');
  if (rows.length > collectionImportMaxRows)
    throw new CollectionCsvError(`Import at most ${collectionImportMaxRows} rows at a time.`);
  const expectedColumns = headers.length;
  rows.forEach(row => {
    if (row.values.length !== expectedColumns)
      row.error ??= `Expected ${expectedColumns} columns; found ${row.values.length}.`;
  });
  const width = Math.max(expectedColumns, ...rows.map(row => row.values.length));
  while (headers.length < width) headers.push(`Column ${headers.length + 1}`);
  return { headers, rows };
}
