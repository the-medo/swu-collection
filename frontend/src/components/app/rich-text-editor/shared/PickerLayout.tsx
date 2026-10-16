import type { ReactNode } from 'react';
import { CircleAlert, LoaderCircle, SearchX, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { DialogClose } from '@/components/ui/dialog.tsx';
import { cn } from '@/lib/utils.ts';

export function PickerBody({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain p-5 sm:p-6',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PickerFooter({ children, hint }: { children?: ReactNode; hint: ReactNode }) {
  return (
    <div className="flex shrink-0 flex-wrap items-center justify-end gap-3 border-t bg-muted/30 px-5 py-4 sm:px-6">
      <p className="mr-auto w-full text-xs leading-relaxed text-muted-foreground sm:w-auto sm:flex-1">
        {hint}
      </p>
      <DialogClose asChild>
        <Button type="button" variant="ghost">
          Cancel
        </Button>
      </DialogClose>
      {children}
    </div>
  );
}

export function PickerNotice({
  title,
  children,
  loading = false,
  error = false,
  icon: Icon = error ? CircleAlert : loading ? LoaderCircle : SearchX,
}: {
  title: string;
  children?: ReactNode;
  loading?: boolean;
  error?: boolean;
  icon?: LucideIcon;
}) {
  return (
    <div
      role={error ? 'alert' : loading ? 'status' : undefined}
      className="flex flex-col items-center gap-3 px-4 py-8 text-center"
    >
      <span
        className={cn(
          'grid size-12 place-items-center rounded-2xl border bg-muted/50 text-muted-foreground',
          error && 'text-destructive',
        )}
      >
        <Icon className={cn('size-5', loading && 'animate-spin')} aria-hidden />
      </span>
      <div className="space-y-2">
        <p className="text-sm font-medium">{title}</p>
        {children && (
          <div className="max-w-sm text-sm leading-relaxed text-muted-foreground">{children}</div>
        )}
      </div>
    </div>
  );
}
