import * as React from 'react';
import { Input } from '@/components/ui/input.tsx';
import { cn } from '@/lib/utils.ts';
import debounce from 'lodash.debounce';
import { useEffect } from 'react';
import { cva, VariantProps } from 'class-variance-authority';

const inputVariants = cva('px-1', {
  variants: {
    width: {
      default: 'w-16',
      sm: 'w-10',
      full: 'w-full',
    },
    alignment: {
      left: 'text-left',
      right: 'text-right',
      center: 'text-center',
    },
    appearance: {
      default: 'border border-input bg-background',
      ghost: 'border-0 bg-transparent',
      outline: 'border border-input bg-transparent',
    },
    size: {
      xs: 'h-6 text-xs',
      sm: 'h-8 text-xs',
      md: 'h-10 text-sm',
      lg: 'h-12 text-base',
    },
  },
  defaultVariants: {
    width: 'default',
    alignment: 'left',
    appearance: 'default',
    size: 'md',
  },
});

export type DebouncedInputProps = VariantProps<typeof inputVariants> & {
  className?: string;
  min?: number;
  max?: number;
} & (
    | {
        type: 'text';
        value: string | undefined;
        onChange: (value: string | undefined) => void;
      }
    | {
        type: 'number';
        value: number | undefined;
        onChange: (value: number | undefined) => void;
      }
  );

const DEBOUNCE_DELAY = 500;

const DebouncedInput: React.FC<DebouncedInputProps> = ({
  width,
  alignment,
  appearance,
  size,
  className,
  type,
  value,
  onChange,
  min,
  max,
}) => {
  const [inputValue, setInputValue] = React.useState<string | undefined>(
    type === 'number' ? value?.toString() : value,
  );

  useEffect(() => {
    setInputValue(type === 'number' ? value?.toString() : value);
  }, [type, value]);

  const debouncedOnChange = React.useMemo(
    () =>
      debounce((v: string) => {
        if (v === '') {
          onChange(undefined);
        } else if (type === 'number') {
          onChange(Number(v));
        } else {
          onChange(v);
        }
      }, DEBOUNCE_DELAY),
    [onChange],
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value ?? undefined;
    setInputValue(newValue);
    debouncedOnChange(newValue);
  };

  useEffect(() => {
    return () => {
      debouncedOnChange.cancel();
    };
  }, [debouncedOnChange]);

  return (
    <Input
      placeholder=""
      className={cn(inputVariants({ width, alignment, appearance, size }), className)}
      type={type}
      value={inputValue}
      onChange={handleChange}
      min={min}
      max={max}
    />
  );
};

export default DebouncedInput;
