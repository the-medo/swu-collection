export function CreationDate({
  publishedAt,
  uploaded = false,
}: {
  publishedAt: string | null;
  uploaded?: boolean;
}) {
  if (!publishedAt) return null;
  const date = new Date(publishedAt);
  if (Number.isNaN(date.getTime())) return null;
  return (
    <time dateTime={date.toISOString()} title={date.toLocaleString()}>
      {uploaded ? 'Uploaded' : 'Published'}{' '}
      {date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
    </time>
  );
}
