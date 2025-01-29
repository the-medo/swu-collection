export const userLocale = navigator ? navigator.language : 'en-US';

export const formatDate = (value: string | Date) =>
  Intl.DateTimeFormat(userLocale, {}).format(typeof value === 'string' ? new Date(value) : value);
