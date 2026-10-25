import { dialogStyles } from '@/components/ui/dialogStyles';
import type { ReactNode } from 'react';

export default function DialogOption({
  htmlFor,
  title,
  description,
  children,
}: {
  htmlFor: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className={dialogStyles.option}>
      {children}
      <span className="flex min-w-0 flex-col gap-1">
        <span className="text-sm font-medium">{title}</span>
        <span className="text-xs leading-relaxed text-muted-foreground">{description}</span>
      </span>
    </label>
  );
}
