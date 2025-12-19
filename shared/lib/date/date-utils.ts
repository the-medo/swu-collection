export const stringOrDateToDate = (date: string | Date): Date => {
  return typeof date === 'string' ? new Date(date) : date;
};
