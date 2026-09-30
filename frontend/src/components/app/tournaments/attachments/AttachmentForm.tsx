import { useState } from 'react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.tsx';
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
  onClose,
}: {
  attachment?: TournamentAttachment;
  uploadsEnabled: boolean;
  pending: boolean;
  save: (action: AttachmentAction) => Promise<unknown>;
  onClose: () => void;
}) {
  const [error, setError] = useState('');
  const form = useForm({
    defaultValues: {
      category: attachment?.category ?? ('travel' as AttachmentCategory),
      kind: attachment?.kind ?? 'text',
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
        onClose();
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Could not save this attachment.');
      }
    },
  });
  return (
    <Dialog
      open
      onOpenChange={open => {
        if (!open && !pending) onClose();
      }}
    >
      <DialogContent
        data-amp-mask
        data-amp-mask-attributes="aria-label"
        className="max-h-[90vh] overflow-y-auto sm:max-w-lg"
      >
        <DialogHeader>
          <DialogTitle>{attachment ? 'Edit attachment' : 'Add attachment'}</DialogTitle>
          <DialogDescription>Only you can access these tournament attachments.</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={event => {
            event.preventDefault();
            void form.handleSubmit();
          }}
        >
          <fieldset disabled={pending} className="space-y-4">
            <form.Field name="category">
              {field => (
                <div className="space-y-1">
                  <Label htmlFor="attachment-category">Category</Label>
                  <Select
                    value={field.state.value}
                    onValueChange={value => field.handleChange(value as AttachmentCategory)}
                    disabled={pending}
                  >
                    <SelectTrigger id="attachment-category">
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
                  <Label htmlFor="attachment-kind">Type</Label>
                  <Select
                    value={field.state.value}
                    onValueChange={value => {
                      field.handleChange(value as TournamentAttachment['kind']);
                      setError('');
                    }}
                    disabled={pending || !!attachment}
                  >
                    <SelectTrigger id="attachment-kind">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="file" disabled={!uploadsEnabled}>
                        Image or PDF
                      </SelectItem>
                      <SelectItem value="text">Text snippet</SelectItem>
                      <SelectItem value="link">Link</SelectItem>
                    </SelectContent>
                  </Select>
                  {!uploadsEnabled && (
                    <p className="text-xs text-muted-foreground">
                      File uploads are currently unavailable. You can still save text and links.
                    </p>
                  )}
                </div>
              )}
            </form.Field>
            <form.Field
              name="title"
              validators={{ onBlur: ({ value }) => (value.trim() ? undefined : 'Enter a title.') }}
            >
              {field => (
                <div className="space-y-1">
                  <Label htmlFor="attachment-title">Title</Label>
                  <Input
                    id="attachment-title"
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
                          <Label htmlFor="attachment-file">File</Label>
                          <Input
                            id="attachment-file"
                            type="file"
                            accept={attachmentMimeTypes.join(',')}
                            required
                            onChange={event => field.handleChange(event.target.files?.[0] ?? null)}
                          />
                          <p className="text-xs text-muted-foreground">
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
                        <Label htmlFor="attachment-content">
                          {kind === 'link' ? 'URL' : 'Text'}
                        </Label>
                        {kind === 'link' ? (
                          <Input
                            id="attachment-content"
                            type="url"
                            value={field.state.value}
                            onChange={event => field.handleChange(event.target.value)}
                            required
                            maxLength={2048}
                            autoComplete="off"
                          />
                        ) : (
                          <Textarea
                            id="attachment-content"
                            className="min-h-36"
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
            <Button type="button" variant="outline" disabled={pending} onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? 'Saving…' : 'Save attachment'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
