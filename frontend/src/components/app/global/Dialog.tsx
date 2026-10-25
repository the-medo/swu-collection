'use client';

import { dialogStyles } from '@/components/ui/dialogStyles';

import {
  Dialog as DialogRoot,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { PropsWithChildren, useMemo } from 'react';
import * as React from 'react';
import { DialogProps as RadixDialogProps } from '@radix-ui/react-dialog';
import { cn } from '@/lib/utils.ts';
import { cva, type VariantProps } from 'class-variance-authority';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

const dialogVariants = cva('max-h-[calc(100dvh-2rem)]', {
  variants: {
    size: {
      default: 'max-w-[480px]',
      medium: 'max-w-[800px]',
      large: 'max-w-[95vw] md:min-h-[80dvh]',
    },
  },
  defaultVariants: {
    size: 'default',
  },
});

export interface DialogProps
  extends PropsWithChildren,
    RadixDialogProps,
    VariantProps<typeof dialogVariants> {
  trigger: React.ReactNode;
  triggerDisabled?: boolean;
  header?: string | React.ReactNode;
  headerDescription?: string | React.ReactNode;
  headerHidden?: boolean;
  footer?: React.ReactNode;
  contentClassName?: string;
}

const Dialog: React.FC<DialogProps> = ({
  trigger,
  triggerDisabled = false,
  header,
  headerDescription,
  headerHidden = false,
  footer,
  children,
  contentClassName,
  size,
  ...rest
}) => {
  const headerComponent = useMemo(() => {
    if (!header) return undefined;
    let h = null;
    if (typeof header === 'string') {
      h = (
        <DialogHeader className={dialogStyles.header}>
          <DialogTitle>{header}</DialogTitle>
          {headerDescription && <DialogDescription>{headerDescription}</DialogDescription>}
        </DialogHeader>
      );
    } else {
      h = <DialogHeader className={dialogStyles.header}>{header}</DialogHeader>;
    }
    return headerHidden ? <VisuallyHidden>{h}</VisuallyHidden> : h;
  }, [header, headerHidden, headerDescription]);

  const footerComponent = useMemo(() => {
    if (!footer) return undefined;
    return <DialogFooter className={dialogStyles.footer}>{footer}</DialogFooter>;
  }, [footer]);

  return (
    <DialogRoot {...rest}>
      <DialogTrigger asChild disabled={triggerDisabled}>
        {trigger}
      </DialogTrigger>
      <DialogContent
        className={cn(
          'flex flex-col gap-0 overflow-hidden p-0',
          dialogStyles.root,
          dialogVariants({ size }),
          contentClassName,
        )}
        {...(!headerDescription && { 'aria-describedby': undefined })}
      >
        {headerComponent}
        <div className={cn('min-h-0 min-w-0 grow overflow-y-auto', dialogStyles.body)}>
          {children}
        </div>
        {footerComponent}
      </DialogContent>
    </DialogRoot>
  );
};

export default Dialog;
