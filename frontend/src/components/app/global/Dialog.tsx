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

export interface DialogProps extends PropsWithChildren, RadixDialogProps {
  trigger: React.ReactNode;
  triggerDisabled?: boolean;
  header?: string | React.ReactNode;
  headerDescription?: string;
  footer?: React.ReactNode;
}

const Dialog: React.FC<DialogProps> = ({
  trigger,
  triggerDisabled = false,
  header,
  headerDescription,
  footer,
  children,
  ...rest
}) => {
  const headerComponent = useMemo(() => {
    if (!header) return null;
    if (typeof header === 'string')
      return (
        <DialogHeader>
          <DialogTitle>{header}</DialogTitle>
          {headerDescription && <DialogDescription>{headerDescription}</DialogDescription>}
        </DialogHeader>
      );
    return <DialogHeader>{header}</DialogHeader>;
  }, [header]);

  const footerComponent = useMemo(() => {
    if (!footer) return null;
    return <DialogFooter>{footer}</DialogFooter>;
  }, [footer]);

  return (
    <DialogRoot {...rest}>
      <DialogTrigger asChild disabled={triggerDisabled}>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]" aria-describedby={headerDescription}>
        {headerComponent}
        {children}
        {footerComponent}
      </DialogContent>
    </DialogRoot>
  );
};

export default Dialog;
