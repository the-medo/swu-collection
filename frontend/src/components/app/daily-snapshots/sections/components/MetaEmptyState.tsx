import { cn } from '@/lib/utils.ts';
import { ChartNoAxesCombined, type LucideIcon } from 'lucide-react';

export default function MetaEmptyState({
  title,
  children,
  icon: Icon = ChartNoAxesCombined,
}: {
  title: string;
  children?: React.ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <div
      className={cn(
        'meta-empty-state flex flex-1 flex-col items-center justify-center gap-2.5 min-h-50 py-6 px-4 border',
        'border-dashed border-[color:var(--meta-line)] rounded-[15px] bg-background/40 text-center',
        '[&_strong]:text-[14px] [&_strong]:font-medium',
      )}
    >
      <span
        className={cn(
          'meta-empty-icon inline-flex items-center justify-center shrink-0 w-11 h-11 border',
          'border-[color:var(--meta-line)] rounded-[14px] bg-[var(--meta-tint)] text-[color:var(--meta-accent)]',
          'mb-0.5',
        )}
      >
        <Icon size={22} aria-hidden="true" />
      </span>
      <strong>{title}</strong>
      {children && (
        <p className="m-0! max-w-85 text-[12px]! leading-[1.6]! text-muted-foreground">
          {children}
        </p>
      )}
    </div>
  );
}
