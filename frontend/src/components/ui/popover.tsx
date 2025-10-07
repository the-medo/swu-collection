import * as React from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';

import { cn } from '@/lib/utils';

type PopoverProps = React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Root> & {
  hover?: boolean;
};

const Popover = ({ hover, ...props }: PopoverProps) => {
  const [open, setOpen] = React.useState(false);

  if (!hover) {
    // Normal popover (click/tap opens it)
    return <PopoverPrimitive.Root {...props} />;
  }

  const onMouseEnter = () => setOpen(true);
  const onMouseLeave = () => setOpen(false);

  // Hover-controlled popover
  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen} {...props}>
      {React.Children.map(props.children, child => {
        if (!React.isValidElement(child)) return child;

        // Inject hover handlers into Trigger and Content
        if ((child as any).type === PopoverTrigger) {
          return React.cloneElement(child, {
            onMouseEnter,
            onMouseLeave,
          });
        }
        if ((child as any).type === PopoverContent) {
          return React.cloneElement(child, {
            onMouseEnter,
            onMouseLeave,
          });
        }

        return child;
      })}
    </PopoverPrimitive.Root>
  );
};

const PopoverTrigger = PopoverPrimitive.Trigger;

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = 'center', sideOffset = 4, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        'z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
        className,
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
));
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

export { Popover, PopoverTrigger, PopoverContent };
