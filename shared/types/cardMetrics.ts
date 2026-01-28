export type CardMetric = {
  drawn?: number;
  played?: number;
  activated?: number;
  discarded?: number;
  resourced?: number;
};

export type CardMetrics = Record<string, CardMetric>;
