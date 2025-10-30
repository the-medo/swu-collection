import { useState } from 'react';
import { useForm } from '@tanstack/react-form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox, handleChangeOfNonindeterminateValue } from '@/components/ui/checkbox';
import MetaSelector from '@/components/app/global/MetaSelector/MetaSelector';
import { usePostTournamentGroup, usePutTournamentGroup } from '@/api/tournament-groups';
import { TournamentGroup } from '../../../../../types/TournamentGroup.ts';
import { z } from 'zod';
import FormFieldError from '@/components/app/global/FormFieldError.tsx';

const nameValidator = z.string().min(1).max(255);
const positionValidator = z.number().min(0);
const metaValidator = z.number().min(1);

interface TournamentGroupFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  initialData?: TournamentGroup;
  metaId?: number | null;
}

export function TournamentGroupForm({
  open,
  onOpenChange,
  onSuccess,
  initialData,
  metaId,
}: TournamentGroupFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!initialData;
  const title = isEditing ? 'Edit Tournament Group' : 'Create Tournament Group';

  const createGroup = usePostTournamentGroup();
  const updateGroup = usePutTournamentGroup(initialData?.id || '');

  const form = useForm({
    defaultValues: {
      name: initialData?.name || '',
      metaId: initialData?.metaId || metaId || null,
      position: initialData?.position || 0,
      description: initialData?.description || '',
      visible: initialData?.visible ?? true,
    },
    onSubmit: async ({ value }) => {
      setIsSubmitting(true);
      try {
        const finalValue = {
          ...value,
          metaId: value?.metaId ?? undefined,
        };

        if (isEditing) {
          await updateGroup.mutateAsync(finalValue);
        } else {
          await createGroup.mutateAsync(finalValue);
        }
        form.reset();
        onSuccess();
      } catch (error) {
        // Error is handled by the mutation hooks
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={e => {
            e.preventDefault();
            e.stopPropagation();
            void form.handleSubmit();
          }}
        >
          {/* Name field */}
          <form.Field
            name="name"
            validators={{
              onChange: nameValidator,
              onBlur: nameValidator,
            }}
            children={field => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Name</Label>
                <Input
                  id={field.name}
                  placeholder="Enter group name"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={e => field.handleChange(e.target.value)}
                  required
                />
                <FormFieldError meta={field.state.meta} />
              </div>
            )}
          />

          {/* Meta field */}
          <form.Field
            name="metaId"
            validators={{
              onChange: metaValidator,
              onBlur: metaValidator,
            }}
            children={field => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Meta</Label>
                <MetaSelector
                  value={field.state.value || null}
                  onChange={field.handleChange}
                  emptyOption={true}
                />
                <FormFieldError meta={field.state.meta} />
              </div>
            )}
          />

          {/* Position field */}
          <form.Field
            name="position"
            validators={{
              onChange: positionValidator,
              onBlur: positionValidator,
            }}
            children={field => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Position</Label>
                <Input
                  id={field.name}
                  type="number"
                  placeholder="Enter position"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={e => field.handleChange(parseInt(e.target.value) || 0)}
                />
                <FormFieldError meta={field.state.meta} />
              </div>
            )}
          />

          {/* Description field */}
          <form.Field
            name="description"
            children={field => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Description</Label>
                <Textarea
                  id={field.name}
                  placeholder="Enter description (optional)"
                  value={field.state.value || ''}
                  onBlur={field.handleBlur}
                  onChange={e => field.handleChange(e.target.value)}
                />
              </div>
            )}
          />

          {/* Visible field */}
          <form.Field
            name="visible"
            children={field => (
              <div className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <Checkbox
                  id={field.name}
                  checked={field.state.value}
                  onCheckedChange={handleChangeOfNonindeterminateValue(field.handleChange)}
                />
                <div className="space-y-1 leading-none">
                  <Label htmlFor={field.name}>Visible</Label>
                </div>
              </div>
            )}
          />

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || createGroup.isPending || updateGroup.isPending}
            >
              {isEditing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
