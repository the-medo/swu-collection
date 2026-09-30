import { useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { format, parseISO } from 'date-fns';
import {
  useEventHighlights,
  useSaveEventHighlight,
  useDeleteEventHighlight,
} from '@/api/tournaments/useEventHighlights.ts';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Textarea } from '@/components/ui/textarea.tsx';
import { Label } from '@/components/ui/label.tsx';
import FormFieldError from '@/components/app/global/FormFieldError.tsx';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog.tsx';
import { eventHighlightInput, type EventHighlight } from '../../../../../types/EventHighlight.ts';

export function EventHighlightsPage() {
  const query = useEventHighlights();
  const remove = useDeleteEventHighlight();
  const [editing, setEditing] = useState<EventHighlight | null>(null);
  const [formKey, setFormKey] = useState(0);
  const reset = () => {
    setEditing(null);
    setFormKey(key => key + 1);
  };
  return (
    <div className="space-y-5">
      <div>
        <h3>Event highlights</h3>
        <p className="text-sm text-muted-foreground">
          Add markers above the tournament map’s week slider. Major tournaments appear
          automatically.
        </p>
      </div>
      <HighlightForm
        key={`${editing?.id ?? 'new'}:${formKey}`}
        saved={editing}
        onSaved={reset}
        onCancel={reset}
      />
      {query.isPending && <p role="status">Loading highlights…</p>}
      {query.error && (
        <div role="alert">
          {query.error.message}{' '}
          <Button variant="link" onClick={() => void query.refetch()}>
            Retry
          </Button>
        </div>
      )}
      {remove.error && (
        <p role="alert" className="text-destructive">
          {remove.error.message}
        </p>
      )}
      {query.data?.length === 0 && (
        <p className="text-sm text-muted-foreground">No custom highlights yet.</p>
      )}
      <div className="space-y-2">
        {query.data?.map(highlight => (
          <article
            key={highlight.id}
            className="flex flex-wrap items-center gap-3 rounded-md border p-3"
          >
            <img src={highlight.imageUrl} alt="" className="size-10 object-contain" />
            <div className="min-w-0 flex-1 basis-40">
              <div className="text-sm font-medium">
                {format(parseISO(highlight.date), 'MMM d, yyyy')}
              </div>
              <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">
                {highlight.description}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setEditing(highlight)}>
              Edit
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={remove.isPending}>
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete highlight?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This removes the custom marker from the tournament map.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() =>
                      remove.mutate(highlight.id, {
                        onSuccess: () => {
                          if (editing?.id === highlight.id) reset();
                        },
                      })
                    }
                  >
                    Delete highlight
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </article>
        ))}
      </div>
    </div>
  );
}

function HighlightForm({
  saved,
  onSaved,
  onCancel,
}: {
  saved: EventHighlight | null;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const mutation = useSaveEventHighlight();
  const form = useForm({
    defaultValues: {
      date: saved?.date ?? '',
      imageUrl: saved?.imageUrl ?? '',
      description: saved?.description ?? '',
    },
    validators: { onChange: eventHighlightInput },
    onSubmit: async ({ value }) => {
      await mutation
        .mutateAsync({ id: saved?.id, input: eventHighlightInput.parse(value) })
        .then(onSaved)
        .catch(() => undefined);
    },
  });
  return (
    <form
      className="space-y-3 rounded-md border p-4"
      onSubmit={event => {
        event.preventDefault();
        void form.handleSubmit();
      }}
    >
      <h4 className="font-medium">{saved ? 'Edit highlight' : 'New highlight'}</h4>
      <fieldset
        disabled={mutation.isPending}
        className="grid gap-3 sm:grid-cols-[12rem_minmax(0,1fr)]"
      >
        {(['date', 'imageUrl', 'description'] as const).map(name => (
          <form.Field key={name} name={name}>
            {field => (
              <div className={name === 'description' ? 'space-y-1 sm:col-span-2' : 'space-y-1'}>
                <Label htmlFor={`highlight-${name}`}>
                  {name === 'imageUrl' ? 'Image URL' : name === 'date' ? 'Date' : 'Description'}
                </Label>
                {name === 'description' ? (
                  <Textarea
                    id={`highlight-${name}`}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={event => field.handleChange(event.target.value)}
                    maxLength={2000}
                    required
                  />
                ) : (
                  <Input
                    id={`highlight-${name}`}
                    type={name === 'date' ? 'date' : 'url'}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={event => field.handleChange(event.target.value)}
                    placeholder={name === 'imageUrl' ? 'https://images.swubase.com/…' : undefined}
                    required
                  />
                )}
                <FormFieldError meta={field.state.meta} />
              </div>
            )}
          </form.Field>
        ))}
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
              disabled={mutation.isPending || !eventHighlightInput.safeParse(values).success}
            >
              {mutation.isPending ? 'Saving…' : 'Save highlight'}
            </Button>
          )}
        </form.Subscribe>
        {saved && (
          <Button type="button" variant="outline" disabled={mutation.isPending} onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
