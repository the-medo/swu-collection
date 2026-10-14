import { useForm } from '@tanstack/react-form';
import { useSaveCardGroup } from '@/api/card-groups/useSaveCardGroup.ts';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Textarea } from '@/components/ui/textarea.tsx';
import { Label } from '@/components/ui/label.tsx';
import { Switch } from '@/components/ui/switch.tsx';
import FormFieldError from '@/components/app/global/FormFieldError.tsx';
import {
  cardGroupInput,
  maxCardGroupPosition,
  type CardGroup,
  type CardGroupInput,
} from '../../../../../../types/CardGroup.ts';
import VariantPicker from './VariantPicker.tsx';

const validatePosition = ({ value }: { value: number }) =>
  cardGroupInput.shape.sortOrder.safeParse(value).error?.issues[0]?.message;

export default function CardGroupForm({
  saved,
  initialPosition,
  onSaved,
  onCancel,
}: {
  saved: CardGroup | null;
  initialPosition: number;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const mutation = useSaveCardGroup();
  const form = useForm({
    defaultValues: {
      title: saved?.title ?? '',
      description: saved?.description ?? '',
      variantIds: saved?.variantIds ?? [],
      published: saved?.published ?? false,
      sortOrder: saved?.sortOrder ?? initialPosition,
    } satisfies CardGroupInput,
    validators: { onChange: cardGroupInput },
    onSubmit: async ({ value }) => {
      await mutation
        .mutateAsync({ id: saved?.id, input: cardGroupInput.parse(value) })
        .then(onSaved)
        .catch(() => undefined);
    },
  });
  return (
    <form
      className="space-y-5 rounded-xl border p-4"
      onSubmit={event => {
        event.preventDefault();
        void form.handleSubmit();
      }}
    >
      <h3 className="text-lg font-semibold">{saved ? 'Edit card group' : 'New card group'}</h3>
      <fieldset disabled={mutation.isPending} className="space-y-5">
        <form.Field name="title">
          {field => (
            <div className="space-y-1">
              <Label htmlFor="group-title">Title</Label>
              <Input
                id="group-title"
                required
                maxLength={150}
                value={field.state.value}
                onChange={event => field.handleChange(event.target.value)}
                onBlur={field.handleBlur}
                placeholder="e.g. Galactic Championship promos"
              />
              <FormFieldError meta={field.state.meta} />
            </div>
          )}
        </form.Field>
        <form.Field name="description">
          {field => (
            <div className="space-y-1">
              <Label htmlFor="group-description">Short description</Label>
              <Textarea
                id="group-description"
                maxLength={500}
                value={field.state.value}
                onChange={event => field.handleChange(event.target.value)}
                onBlur={field.handleBlur}
                placeholder="What makes these cards special?"
              />
              <FormFieldError meta={field.state.meta} />
            </div>
          )}
        </form.Field>
        <form.Field
          name="sortOrder"
          validators={{ onMount: validatePosition, onChange: validatePosition }}
        >
          {field => (
            <div className="space-y-1">
              <Label htmlFor="group-position">Position</Label>
              <Input
                id="group-position"
                type="number"
                required
                min={0}
                max={maxCardGroupPosition}
                step={1}
                className="max-w-48"
                value={Number.isNaN(field.state.value) ? '' : field.state.value}
                onChange={event => field.handleChange(event.target.valueAsNumber)}
                onBlur={field.handleBlur}
                aria-describedby="group-position-help"
              />
              <p id="group-position-help" className="text-xs text-muted-foreground">
                Higher positions appear first on the promo page.
              </p>
              <FormFieldError meta={field.state.meta} />
            </div>
          )}
        </form.Field>
        <form.Field name="published">
          {field => (
            <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
              <Switch
                id="group-published"
                checked={field.state.value}
                onCheckedChange={field.handleChange}
              />
              <div>
                <Label htmlFor="group-published">Publish on promo page</Label>
                <p className="text-xs text-muted-foreground">
                  Draft groups stay visible only in administration.
                </p>
              </div>
            </div>
          )}
        </form.Field>
        <form.Field name="variantIds">
          {field => (
            <div className="space-y-2">
              <VariantPicker value={field.state.value} onChange={field.handleChange} />
              <FormFieldError meta={field.state.meta} />
            </div>
          )}
        </form.Field>
      </fieldset>
      {mutation.error && (
        <p role="alert" className="text-sm text-destructive">
          {mutation.error.message}
        </p>
      )}
      <div className="flex gap-2">
        <form.Subscribe selector={state => state.values}>
          {values => (
            <Button
              type="submit"
              disabled={mutation.isPending || !cardGroupInput.safeParse(values).success}
            >
              {mutation.isPending
                ? 'Saving…'
                : values.published
                  ? 'Save and publish'
                  : 'Save draft'}
            </Button>
          )}
        </form.Subscribe>
        <Button type="button" variant="outline" disabled={mutation.isPending} onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
