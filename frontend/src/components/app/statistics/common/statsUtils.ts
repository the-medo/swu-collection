export const getWRColor = (wr: number) => {
  if (wr > 50) return 'text-green-600';
  if (wr < 50) return 'text-red-600';
  return 'text-muted-foreground';
};

export const getWRHexColor = (wr: number) => {
  if (wr > 50) return '#16a34a'; // green-600
  if (wr < 50) return '#dc2626'; // red-600
  return '#71717a'; // muted-foreground (zinc-500 approx)
};
