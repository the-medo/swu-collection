import { useId, useRef, useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Textarea } from '@/components/ui/textarea.tsx';
import { Label } from '@/components/ui/label.tsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.tsx';
import { FileUp, Link, Text } from 'lucide-react';
import { cn } from '@/lib/utils.ts';
import FormFieldError from '@/components/app/global/FormFieldError.tsx';
import {
  attachmentCategories,
  attachmentCategoryLabels,
  attachmentCreateInput,
  attachmentUploadInput,
  attachmentUpdateInput,
  attachmentMimeTypes,
  privateLink,
  type AttachmentCategory,
  type TournamentAttachment,
} from '../../../../../../types/TournamentAttachment.ts';
import type { AttachmentAction } from '@/api/tournaments/useTournamentAttachments.ts';

export function AttachmentForm({
  attachment,
  uploadsEnabled,
  pending,
  save,
  onSaved,
  onCancel,
}: {
  attachment?: TournamentAttachment;
  uploadsEnabled: boolean;
  pending: boolean;
  save: (action: AttachmentAction) => Promise<unknown>;
  onSaved?: () => void;
  onCancel?: () => void;
}) {
  const [error, setError] = useState('');
  const id = useId();
  const fileInput = useRef<HTMLInputElement>(null);
  const form = useForm({
    defaultValues: {
      category: attachment?.category ?? ('travel' as AttachmentCategory),
      kind: attachment?.kind ?? (uploadsEnabled ? 'file' : 'text'),
      title: attachment?.title ?? '',
      content: attachment?.content ?? '',
      file: null as File | null,
    },
    onSubmit: async ({ value }) => {
      setError('');
      const input = {
        category: value.category,
        title: value.title,
        ...(value.kind === 'file' ? {} : { content: value.content }),
      };
      const parsed = attachment
        ? attachmentUpdateInput.safeParse(input)
        : value.kind === 'file'
          ? attachmentUploadInput.safeParse({ ...input, file: value.file })
          : attachmentCreateInput.safeParse({ ...input, kind: value.kind });
      if (!parsed.success) {
        setError(parsed.error.issues.map(issue => issue.message).join(' '));
        return;
      }
      if (value.kind === 'link' && !privateLink.safeParse(value.content).success) {
        setError('Use an HTTP or HTTPS link without credentials.');
        return;
      }
      try {
        if (attachment)
          await save({
            type: 'update',
            id: attachment.id,
            input: attachmentUpdateInput.parse(input),
          });
        else if (value.kind === 'file')
          await save({
            type: 'upload',
            input: attachmentUploadInput.parse({ ...input, file: value.file }),
          });
        else
          await save({
            type: 'create',
            input: attachmentCreateInput.parse({ ...input, kind: value.kind }),
          });
        if (!attachment) {
          form.reset({ ...value, title: '', content: '', file: null }, { keepDefaultValues: true });
          if (fileInput.current) fileInput.current.value = '';
        }
        onSaved?.();
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Could not save this attachment.');
      }
    },
  });
  return (
    <form
      aria-label={attachment ? 'Edit attachment' : 'Add attachment'}
      data-amp-mask
      data-amp-mask-attributes="aria-label"
      className="min-w-0 space-y-3"
      onSubmit={event => {
        event.preventDefault();
        void form.handleSubmit();
      }}
    >
      <fieldset disabled={pending} className="min-w-0 space-y-3">
        <div className="space-y-3">
          <form.Field name="category">
            {field => (
              <div className="space-y-1">
                <Label htmlFor={`${id}-category`} className="text-xs">
                  Category
                </Label>
                <Select
                  value={field.state.value}
                  disabled={pending}
                  onValueChange={value => {
                    const category = attachmentCategories.find(category => category === value);
                    if (category) field.handleChange(category);
                  }}
                >
                  <SelectTrigger id={`${id}-category`} className="h-9 bg-card text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {attachmentCategories.map(category => (
                      <SelectItem key={category} value={category}>
                        {attachmentCategoryLabels[category]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </form.Field>
          <form.Field name="kind">
            {field => (
              <div className="space-y-1">
                <span id={`${id}-kind`} className="text-xs font-medium">
                  Type
                </span>
                <div
                  role="group"
                  aria-labelledby={`${id}-kind`}
                  className="grid grid-cols-3 gap-1 rounded-lg border bg-card p-1"
                >
                  {(['file', 'text', 'link'] as const).map(kind => (
                    <Button
                      key={kind}
                      type="button"
                      size="sm"
                      className={cn(
                        'h-7 gap-1.5 rounded-md px-2 text-xs',
                        field.state.value === kind &&
                          'bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary',
                      )}
                      variant="ghost"
                      aria-pressed={field.state.value === kind}
                      disabled={!!attachment || (kind === 'file' && !uploadsEnabled)}
                      onClick={() => {
                        if (field.state.value === kind) return;
                        field.handleChange(kind);
                        form.setFieldValue('file', null);
                        if (fileInput.current) fileInput.current.value = '';
                        setError('');
                      }}
                    >
                      {kind === 'file' ? (
                        <FileUp className="size-3.5" aria-hidden="true" />
                      ) : kind === 'link' ? (
                        <Link className="size-3.5" aria-hidden="true" />
                      ) : (
                        <Text className="size-3.5" aria-hidden="true" />
                      )}
                      {{ file: 'File', text: 'Text', link: 'Link' }[kind]}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </form.Field>
        </div>
        {!uploadsEnabled && !attachment && (
          <p className="text-xs leading-snug! text-muted-foreground">
            File uploads are currently unavailable. You can still save text and links.
          </p>
        )}
        <form.Field
          name="title"
          validators={{ onBlur: ({ value }) => (value.trim() ? undefined : 'Enter a title.') }}
        >
          {field => (
            <div className="space-y-1">
              <Label htmlFor={`${id}-title`} className="text-xs">
                Title
              </Label>
              <Input
                id={`${id}-title`}
                className="h-9 bg-card text-sm"
                placeholder="e.g. Train reservation"
                value={field.state.value}
                onChange={event => field.handleChange(event.target.value)}
                onBlur={field.handleBlur}
                required
                maxLength={160}
                autoComplete="off"
              />
              <FormFieldError meta={field.state.meta} />
            </div>
          )}
        </form.Field>
        <form.Subscribe selector={state => state.values.kind}>
          {kind =>
            kind === 'file' ? (
              attachment ? (
                <p className="text-sm text-muted-foreground">{attachment.fileName}</p>
              ) : (
                <form.Field name="file">
                  {field => (
                    <div className="space-y-1">
                      <Label htmlFor={`${id}-file`}>File</Label>
                      <Input
                        ref={fileInput}
                        id={`${id}-file`}
                        type="file"
                        accept={attachmentMimeTypes.join(',')}
                        required
                        onChange={event => field.handleChange(event.target.files?.[0] ?? null)}
                      />
                      <p className="text-xs leading-snug! text-muted-foreground">
                        PNG, JPEG, WebP, GIF or PDF. Up to 10 MB.
                      </p>
                    </div>
                  )}
                </form.Field>
              )
            ) : (
              <form.Field name="content">
                {field => (
                  <div className="space-y-1">
                    <Label htmlFor={`${id}-content`} className="text-xs">
                      {kind === 'link' ? 'URL' : 'Text'}
                    </Label>
                    {kind === 'link' ? (
                      <Input
                        id={`${id}-content`}
                        type="url"
                        className="h-9 bg-card text-sm"
                        placeholder="https://…"
                        value={field.state.value}
                        onChange={event => field.handleChange(event.target.value)}
                        required
                        maxLength={2048}
                        autoComplete="off"
                      />
                    ) : (
                      <Textarea
                        id={`${id}-content`}
                        className="min-h-24 bg-card text-sm"
                        value={field.state.value}
                        onChange={event => field.handleChange(event.target.value)}
                        required
                        maxLength={20_000}
                      />
                    )}
                  </div>
                )}
              </form.Field>
            )
          }
        </form.Subscribe>
      </fieldset>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" disabled={pending} onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? 'Saving…' : 'Save attachment'}
        </Button>
      </div>
    </form>
  );
}
