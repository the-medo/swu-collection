export function CountBadge({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border px-2 py-1 text-xs">
      <span className="text-muted-foreground">{label}</span>{' '}
      <span className="font-semibold">{value}</span>
    </div>
  );
}
