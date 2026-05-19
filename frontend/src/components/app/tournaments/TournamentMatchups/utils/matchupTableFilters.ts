import {
  matchupFilterTextMaxLength,
  type MatchupDimensionFilterConfig,
  type MatchupTableFilterConfig,
  type SavedTournamentMatchupFilter,
} from '../../../../../../../types/TournamentMatchupFilters.ts';
import { SwuAspect } from '../../../../../../../types/enums.ts';
import type { MatchupKeyInfo } from '../types.ts';

export type MatchupTableFilterState = MatchupTableFilterConfig;

type MatchupTableFilterInput = Partial<
  Omit<MatchupTableFilterConfig, 'rowFilters' | 'columnFilters'>
> & {
  rowFilters?: Partial<MatchupDimensionFilterConfig> | null;
  columnFilters?: Partial<MatchupDimensionFilterConfig> | null;
};

export type MatchupKeySearchTextResolver = (
  key: string,
  info: MatchupKeyInfo | undefined,
) => string | null | undefined;

const swuAspectValues = new Set<string>(Object.values(SwuAspect));

export const createDefaultMatchupDimensionFilter = (): MatchupDimensionFilterConfig => ({
  text: '',
  aspects: [],
});

export const createDefaultMatchupTableFilterState = (): MatchupTableFilterState => ({
  isMirrored: false,
  rowFilters: createDefaultMatchupDimensionFilter(),
  columnFilters: createDefaultMatchupDimensionFilter(),
});

export const defaultMatchupTableFilterState = createDefaultMatchupTableFilterState();

const cloneDimensionFilter = (
  filter: MatchupDimensionFilterConfig,
): MatchupDimensionFilterConfig => ({
  text: filter.text,
  aspects: [...filter.aspects],
});

export const normalizeMatchupDimensionFilterConfig = (
  filter: Partial<MatchupDimensionFilterConfig> | null | undefined,
): MatchupDimensionFilterConfig => {
  const text = (filter?.text ?? '').trim().slice(0, matchupFilterTextMaxLength);
  const aspects = Array.isArray(filter?.aspects)
    ? filter.aspects.filter((aspect, index, allAspects) => {
        return swuAspectValues.has(aspect) && allAspects.indexOf(aspect) === index;
      })
    : [];

  return { text, aspects };
};

export const normalizeMatchupTableFilterConfig = (
  filter: MatchupTableFilterInput | null | undefined,
): MatchupTableFilterState => {
  const rowFilters = normalizeMatchupDimensionFilterConfig(filter?.rowFilters);
  const isMirrored = Boolean(filter?.isMirrored);
  const columnFilters = isMirrored
    ? cloneDimensionFilter(rowFilters)
    : normalizeMatchupDimensionFilterConfig(filter?.columnFilters);

  return {
    isMirrored,
    rowFilters,
    columnFilters,
  };
};

export const hydrateSavedMatchupTableFilter = (
  savedFilter: SavedTournamentMatchupFilter,
): MatchupTableFilterState => {
  return normalizeMatchupTableFilterConfig({
    isMirrored: savedFilter.isMirrored,
    rowFilters: savedFilter.rowFilters,
    columnFilters: savedFilter.isMirrored ? savedFilter.rowFilters : savedFilter.columnFilters,
  });
};

export const getEffectiveMatchupTableFilters = (
  filter: MatchupTableFilterConfig,
): Pick<MatchupTableFilterState, 'rowFilters' | 'columnFilters'> => {
  const normalized = normalizeMatchupTableFilterConfig(filter);

  return {
    rowFilters: normalized.rowFilters,
    columnFilters: normalized.columnFilters,
  };
};

export const hasActiveMatchupDimensionFilter = (
  filter: Partial<MatchupDimensionFilterConfig> | null | undefined,
) => {
  const normalized = normalizeMatchupDimensionFilterConfig(filter);
  return normalized.text.length > 0 || normalized.aspects.length > 0;
};

export const hasActiveMatchupTableFilters = (
  filter: MatchupTableFilterInput | null | undefined,
) => {
  const normalized = normalizeMatchupTableFilterConfig(filter);

  if (normalized.isMirrored) {
    return hasActiveMatchupDimensionFilter(normalized.rowFilters);
  }

  return (
    hasActiveMatchupDimensionFilter(normalized.rowFilters) ||
    hasActiveMatchupDimensionFilter(normalized.columnFilters)
  );
};

const getSearchText = (
  key: string,
  info: MatchupKeyInfo | undefined,
  resolveSearchText?: MatchupKeySearchTextResolver,
) => {
  const resolvedText = resolveSearchText?.(key, info);

  return [key, info?.rawKey, typeof resolvedText === 'string' ? resolvedText : undefined]
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase();
};

const parseAspectKey = (key: string): SwuAspect[] => {
  const aspects = key
    .split('-')
    .map(part => part.trim())
    .filter((part): part is SwuAspect => swuAspectValues.has(part));

  return aspects.length === key.split('-').length ? aspects : [];
};

const keyMatchesAspectFilter = (
  key: string,
  info: MatchupKeyInfo | undefined,
  selectedAspects: SwuAspect[],
) => {
  if (!selectedAspects.length) return true;

  const aspectCandidates = [
    parseAspectKey(info?.rawKey ?? key),
    ...(info?.sourceDeckAspects ?? []),
  ].filter(aspects => aspects.length > 0);

  // When an aspect filter is active, unknown aspect data should not match by accident.
  if (!aspectCandidates.length) return false;

  return aspectCandidates.some(aspects =>
    selectedAspects.every(selectedAspect => aspects.includes(selectedAspect)),
  );
};

export const filterMatchupKeys = (
  keys: string[],
  filter: Partial<MatchupDimensionFilterConfig> | null | undefined,
  keyInfo: Record<string, MatchupKeyInfo>,
  resolveSearchText?: MatchupKeySearchTextResolver,
) => {
  const normalized = normalizeMatchupDimensionFilterConfig(filter);
  const searchText = normalized.text.toLocaleLowerCase();

  if (!hasActiveMatchupDimensionFilter(normalized)) {
    return keys;
  }

  return keys.filter(key => {
    const info = keyInfo[key];
    const textMatches =
      !searchText || getSearchText(key, info, resolveSearchText).includes(searchText);
    const aspectsMatch = keyMatchesAspectFilter(key, info, normalized.aspects);

    return textMatches && aspectsMatch;
  });
};

export const summarizeMatchupDimensionFilter = (
  filter: Partial<MatchupDimensionFilterConfig> | null | undefined,
) => {
  const normalized = normalizeMatchupDimensionFilterConfig(filter);
  const parts: string[] = [];

  if (normalized.text) parts.push(`Text: ${normalized.text}`);
  if (normalized.aspects.length) parts.push(`Aspects: ${normalized.aspects.join(', ')}`);

  return parts.join('; ') || 'No filters';
};

export const summarizeMatchupTableFilter = (filter: MatchupTableFilterInput | null | undefined) => {
  const normalized = normalizeMatchupTableFilterConfig(filter);

  if (!hasActiveMatchupTableFilters(normalized)) return 'No filters';

  if (normalized.isMirrored) {
    return `Rows and columns: ${summarizeMatchupDimensionFilter(normalized.rowFilters)}`;
  }

  const parts: string[] = [];
  if (hasActiveMatchupDimensionFilter(normalized.rowFilters)) {
    parts.push(`Rows: ${summarizeMatchupDimensionFilter(normalized.rowFilters)}`);
  }
  if (hasActiveMatchupDimensionFilter(normalized.columnFilters)) {
    parts.push(`Columns: ${summarizeMatchupDimensionFilter(normalized.columnFilters)}`);
  }

  return parts.join(' | ');
};
