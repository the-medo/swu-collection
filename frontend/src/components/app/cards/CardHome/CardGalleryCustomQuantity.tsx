import { useId, useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { Ellipsis } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import FormFieldError from '@/components/app/global/FormFieldError.tsx';
import { cn } from '@/lib/utils.ts';
import { zCollectionCardSchema } from '../../../../../../types/ZCollectionCard.ts';

interface CustomQuantityProps {
  amount: number;
  disabled: boolean;
  busy: boolean;
  onSave: (amount: number) => Promise<boolean>;
}

export default function CardGalleryCustomQuantity(props: CustomQuantityProps) {
  const [open, setOpen] = useState(false);
  return (
    <Popover
      open={open}
      onOpenChange={next => {
        if (!next || (!props.busy && !props.disabled)) setOpen(next);
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Custom quantity (${props.amount} in list)`}
          title={`Custom quantity · ${props.amount} in list`}
          disabled={props.disabled}
          aria-disabled={props.busy || props.disabled}
          className={cn(
            'flex h-7 w-6 shrink-0 items-center justify-center rounded-sm text-[10px] font-semibold tabular-nums hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50',
            props.amount > 3 && 'bg-primary text-primary-foreground hover:bg-primary/90',
            props.busy && 'cursor-wait opacity-50',
          )}
        >
          {props.amount > 3 ? props.amount : <Ellipsis className="size-4" aria-hidden="true" />}
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="end"
        className="w-56 max-w-[calc(100vw-2rem)] p-3"
        aria-label="Custom quantity"
      >
        <CustomQuantityForm {...props} onSaved={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  );
}

function CustomQuantityForm({
  amount,
  disabled,
  busy,
  onSave,
  onSaved,
}: CustomQuantityProps & { onSaved: () => void }) {
  const inputId = useId();
  const form = useForm({
    defaultValues: { amount: String(amount) },
    onSubmit: async ({ value }) => {
      if (disabled || busy) return;
      if (await onSave(Number(value.amount))) onSaved();
    },
  });
  return (
    <form
      className="space-y-3"
      noValidate
      onSubmit={event => {
        event.preventDefault();
        void form.handleSubmit();
      }}
    >
      <form.Field
        name="amount"
        validators={{
          onChange: ({ value }) =>
            value.trim() !== '' &&
            zCollectionCardSchema.shape.amount.safeParse(Number(value)).success
              ? undefined
              : 'Enter a whole number from 0 to 1000.',
        }}
      >
        {field => (
          <div className="space-y-2">
            <Label htmlFor={inputId}>Quantity</Label>
            <Input
              id={inputId}
              type="number"
              inputMode="numeric"
              min={0}
              max={1000}
              step={1}
              value={field.state.value}
              onChange={event => field.handleChange(event.target.value)}
              onBlur={field.handleBlur}
              readOnly={busy || disabled}
              aria-invalid={!field.state.meta.isValid}
              aria-describedby={`${inputId}-error`}
            />
            <div id={`${inputId}-error`}>
              <FormFieldError meta={field.state.meta} />
            </div>
          </div>
        )}
      </form.Field>
      <form.Subscribe selector={state => [state.canSubmit, state.isSubmitting]}>
        {([canSubmit, isSubmitting]) => (
          <Button
            type="submit"
            size="sm"
            className="w-full"
            disabled={!canSubmit && !isSubmitting}
            aria-disabled={disabled || busy || isSubmitting}
          >
            {isSubmitting ? 'Saving…' : 'Save quantity'}
          </Button>
        )}
      </form.Subscribe>
    </form>
  );
}
