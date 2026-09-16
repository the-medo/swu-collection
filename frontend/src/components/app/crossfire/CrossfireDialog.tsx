import * as React from 'react';
import { cn } from '@/lib/utils.ts';
import {
  Dialog,
  DialogClose,
  DialogContent as BaseDialogContent,
  DialogDescription as BaseDialogDescription,
  DialogFooter as BaseDialogFooter,
  DialogHeader as BaseDialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle as BaseDialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog.tsx';

const DialogContent = React.forwardRef<
  React.ElementRef<typeof BaseDialogContent>,
  React.ComponentPropsWithoutRef<typeof BaseDialogContent>
>(({ className, ...props }, ref) => (
  <BaseDialogContent ref={ref} className={cn('cf-modal', className)} {...props} />
));
DialogContent.displayName = 'CrossfireDialogContent';

function DialogHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <BaseDialogHeader className={cn('cf-modal-header', className)} {...props}>
      <span className="cf-modal-kicker" aria-hidden="true">
        Crossfire
      </span>
      {children}
    </BaseDialogHeader>
  );
}

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof BaseDialogTitle>,
  React.ComponentPropsWithoutRef<typeof BaseDialogTitle>
>(({ className, ...props }, ref) => (
  <BaseDialogTitle ref={ref} className={cn('cf-modal-title', className)} {...props} />
));
DialogTitle.displayName = 'CrossfireDialogTitle';

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof BaseDialogDescription>,
  React.ComponentPropsWithoutRef<typeof BaseDialogDescription>
>(({ className, ...props }, ref) => (
  <BaseDialogDescription ref={ref} className={cn('cf-modal-description', className)} {...props} />
));
DialogDescription.displayName = 'CrossfireDialogDescription';

function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <BaseDialogFooter className={cn('cf-modal-footer', className)} {...props} />;
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
