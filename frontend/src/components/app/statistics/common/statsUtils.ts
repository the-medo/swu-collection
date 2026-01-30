export const getWRColor = (wr: number) => {
  if (wr > 50) return 'text-green-600';
  if (wr < 50) return 'text-red-600';
  return 'text-black';
};
