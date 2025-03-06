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

export interface DialogProps extends PropsWithChildren, RadixDialogProps {
  trigger: React.ReactNode;
  triggerDisabled?: boolean;
  header?: string | React.ReactNode;
  headerDescription?: string | React.ReactNode;
  footer?: React.ReactNode;
  contentClassName?: string;
}

const Dialog: React.FC<DialogProps> = ({
  trigger,
  triggerDisabled = false,
  header,
  headerDescription,
  footer,
  children,
  contentClassName,
  ...rest
}) => {
  const headerComponent = useMemo(() => {
    if (!header) return undefined;
    if (typeof header === 'string')
      return (
        <DialogHeader className="bg-background">
          <DialogTitle>{header}</DialogTitle>
          {headerDescription && <DialogDescription>{headerDescription}</DialogDescription>}
        </DialogHeader>
      );
    return <DialogHeader className="bg-background">{header}</DialogHeader>;
  }, [header, headerDescription]);

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
        className={cn(
          'sm:max-w-[425px] md:max-h-[90%] flex flex-col max-h-[90vh]',
          contentClassName,
        )}
        aria-describedby={headerDescription}
      >
        {headerComponent}
        <div className="overflow-y-auto flex-grow">{children}</div>
        {footerComponent}
      </DialogContent>
    </DialogRoot>
  );
};

export default Dialog;
