const TIMESTAMP_WITH_TIMEZONE_REGEX = /(Z|[+-]\d{2}:\d{2})$/i;

const parsedDateCache: Map<string | number | Date, Date> = new Map();

export const parseStatisticsTimestamp = (value?: string | number | Date | null): Date => {
  if (!value) {
    return new Date(0);
  }

  if (parsedDateCache.has(value)) {
    return parsedDateCache.get(value)!;
  }

  if (value instanceof Date) {
    return value;
  }

  if (typeof value === 'number') {
    return new Date(value);
  }

  const normalizedValue = value.includes('T') ? value : value.replace(' ', 'T');
  const valueWithTimezone = TIMESTAMP_WITH_TIMEZONE_REGEX.test(normalizedValue)
    ? normalizedValue
    : `${normalizedValue}Z`;

  parsedDateCache.set(value, new Date(valueWithTimezone));

  return new Date(valueWithTimezone);
};

export const getStatisticsTimestampMs = (value?: string | number | Date | null): number =>
  parseStatisticsTimestamp(value).getTime();
