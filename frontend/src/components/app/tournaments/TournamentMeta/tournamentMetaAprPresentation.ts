import type { Store } from '@tanstack/react-store';
import {
  aprMetrics,
  type analyzeAprComparisons,
  type AprComparisonItem,
  type AprMetric,
} from './tournamentMetaApr.ts';
import type { MetaInfo } from './MetaInfoSelector.tsx';

export type AprChartItem = AprComparisonItem & { name: string; hasArtwork: boolean };
export type AprAnalysis = ReturnType<typeof analyzeAprComparisons>;
export interface AprPlotProps {
  data: AprChartItem[];
  analysis: AprAnalysis;
  axisExtent: number;
  metaInfo: MetaInfo;
  sortMetric: AprMetric;
}

export type AprInteractionStore = Store<{
  bar: { key: string; metric: AprMetric } | null;
  hidden: boolean;
  keyboardIndex: number | null;
}>;

export const APR_BATCH_SIZE = 10;
export const APR_LABEL_WIDTH = 140;
export const APR_PLOT_TOP = 12;
export const APR_PLOT_BOTTOM = 38;
export const APR_HEADER_HEIGHT = 56;
export const APR_VALUE_COLUMN_WIDTH = 124;

export const formatRate = (value: number | null) => {
  if (value == null) return '—';
  const rounded = Number(value.toFixed(1));
  return `${rounded > 0 ? '+' : ''}${rounded.toFixed(1)}%`;
};

export const chartConfig = {
  'field-day2': { label: aprMetrics['field-day2'].label, color: 'hsl(var(--chart-1))' },
  'field-top8': { label: aprMetrics['field-top8'].label, color: 'hsl(var(--chart-3))' },
  'day2-top8': { label: aprMetrics['day2-top8'].label, color: 'hsl(var(--chart-4))' },
  'top8-champions': { label: aprMetrics['top8-champions'].label, color: 'hsl(var(--chart-5))' },
  combined: {
    label: aprMetrics.combined.label,
    color: 'var(--competition-accent, hsl(var(--chart-2)))',
  },
};
