'use client';

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

const dialogVariants = cva('max-w-[100vw] lg:max-w-[90vw] max-h-screen lg:max-h-[90vh] ', {
  variants: {
    size: {
      default: 'lg:max-w-[425px]',
      medium: 'lg:max-w-[800px]',
      large: 'lg:max-w-[95%] h-screen md:min-h-[80%] md:max-h-[90%]',
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
        <DialogHeader className="bg-background">
          <DialogTitle>{header}</DialogTitle>
          {headerDescription && <DialogDescription>{headerDescription}</DialogDescription>}
        </DialogHeader>
      );
    } else {
      h = <DialogHeader className="bg-background">{header}</DialogHeader>;
    }
    return headerHidden ? <VisuallyHidden>{h}</VisuallyHidden> : h;
  }, [header, headerHidden, headerDescription]);

  const footerComponent = useMemo(() => {
    if (!footer) return undefined;
    return <DialogFooter className="bg-background mt-auto">{footer}</DialogFooter>;
  }, [footer]);

  return (
    <DialogRoot {...rest}>
      <DialogTrigger asChild disabled={triggerDisabled}>
        {trigger}
      </DialogTrigger>
      <DialogContent
        className={cn('flex flex-col p-2 md:p-4', contentClassName, dialogVariants({ size }))}
        aria-describedby={typeof headerDescription === 'string' ? headerDescription : undefined}
      >
        {headerComponent}
        <div className="overflow-y-auto grow">{children}</div>
        {footerComponent}
      </DialogContent>
    </DialogRoot>
  );
};

export default Dialog;
