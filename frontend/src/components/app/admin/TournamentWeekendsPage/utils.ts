export function formatDate(value: string | Date | null | undefined) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString();
}

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return '-';
  return new Date(value).toLocaleString();
}

export function getMeleeUrl(meleeId: string | null) {
  return meleeId ? `https://melee.gg/Tournament/View/${meleeId}` : null;
}
