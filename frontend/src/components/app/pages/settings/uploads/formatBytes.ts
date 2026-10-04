export function formatBytes(bytes: number) {
  if (bytes < 1000) return `${bytes} B`;
  if (bytes < 1_000_000)
    return `${(bytes / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })} KB`;
  return `${(bytes / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 2 })} MB`;
}
